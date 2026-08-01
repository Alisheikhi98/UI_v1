import assert from "node:assert/strict";
import test from "node:test";
import {
  ClassAssignmentPartialFailureError,
  ClassAssignmentReconciler,
  ClassAssignmentSaveInProgressError,
} from "../src/lib/api/class-assignment-reconciliation.ts";

const assignment = (overrides = {}) => ({
  id: "1",
  classId: "10",
  courseId: "100",
  teacherId: "200",
  weeklyPeriods: 2,
  ...overrides,
});

function createOperations(initial = []) {
  let state = structuredClone(initial);
  const sequence = [];
  return {
    sequence,
    snapshot: () => structuredClone(state),
    operations: {
      async load(classId) {
        sequence.push(`GET:${classId}`);
        return structuredClone(state);
      },
      async remove(classId, assignmentId) {
        sequence.push(`DELETE:${classId}:${assignmentId}`);
        state = state.filter((item) => item.id !== assignmentId);
      },
      async update(classId, operation) {
        sequence.push(`PATCH:${classId}:${operation.assignmentId}`);
        state = state.map((item) =>
          item.id === operation.assignmentId
            ? {
                ...item,
                teacherId: operation.teacherId,
                weeklyPeriods: operation.weeklyPeriods,
              }
            : item,
        );
      },
      async create(classId, operation) {
        sequence.push(`POST:${classId}:${operation.courseId}`);
        state.push(assignment({ id: `server-${state.length + 1}`, classId, ...operation }));
      },
    },
  };
}

test("reconciliation creates, updates, and deletes in deterministic order", async () => {
  const fake = createOperations([
    assignment({ id: "1", courseId: "100" }),
    assignment({ id: "2", courseId: "101" }),
    assignment({ id: "3", courseId: "102" }),
  ]);
  const reconciler = new ClassAssignmentReconciler(fake.operations);

  const result = await reconciler.replaceForClass("10", [
    assignment({ id: "1", courseId: "100", teacherId: "900", weeklyPeriods: 4 }),
    assignment({ id: undefined, courseId: "103", teacherId: "901", weeklyPeriods: 3 }),
  ]);

  assert.deepEqual(fake.sequence, [
    "GET:10",
    "DELETE:10:2",
    "DELETE:10:3",
    "PATCH:10:1",
    "POST:10:103",
    "GET:10",
  ]);
  assert.deepEqual(result, fake.snapshot());
});

test("changing a course deletes the old assignment and creates a new one", async () => {
  const fake = createOperations([assignment()]);
  const reconciler = new ClassAssignmentReconciler(fake.operations);

  await reconciler.replaceForClass("10", [
    assignment({ courseId: "999", teacherId: "201", weeklyPeriods: 5 }),
  ]);

  assert.deepEqual(fake.sequence, ["GET:10", "DELETE:10:1", "POST:10:999", "GET:10"]);
  assert.equal(fake.snapshot()[0].courseId, "999");
});

test("the same teacher may teach multiple different courses", async () => {
  const fake = createOperations();
  const reconciler = new ClassAssignmentReconciler(fake.operations);

  await reconciler.replaceForClass("10", [
    assignment({ id: undefined, courseId: "100", teacherId: "200" }),
    assignment({ id: undefined, courseId: "101", teacherId: "200" }),
  ]);

  assert.equal(fake.snapshot().length, 2);
  assert.equal(fake.snapshot()[0].teacherId, fake.snapshot()[1].teacherId);
});

test("duplicate courses are rejected before reading or mutating server state", async () => {
  const fake = createOperations();
  const reconciler = new ClassAssignmentReconciler(fake.operations);

  await assert.rejects(
    reconciler.replaceForClass("10", [
      assignment({ id: undefined }),
      assignment({ id: undefined, teacherId: "201" }),
    ]),
    /Duplicate courses/,
  );
  assert.deepEqual(fake.sequence, []);
});

test("a second save for the same class is rejected while the first is pending", async () => {
  let resolveFirstLoad;
  let loadCount = 0;
  const operations = {
    async load() {
      loadCount += 1;
      if (loadCount === 1) {
        return new Promise((resolve) => {
          resolveFirstLoad = resolve;
        });
      }
      return [];
    },
    async remove() {},
    async update() {},
    async create() {},
  };
  const reconciler = new ClassAssignmentReconciler(operations);
  const firstSave = reconciler.replaceForClass("10", []);
  await Promise.resolve();

  await assert.rejects(reconciler.replaceForClass("10", []), ClassAssignmentSaveInProgressError);
  resolveFirstLoad([]);
  await firstSave;
});

test("partial failure immediately refetches and exposes server state plus the API error", async () => {
  const current = assignment();
  let loadCount = 0;
  const sequence = [];
  const apiError = new Error("Backend rejected the teacher.");
  const reconciler = new ClassAssignmentReconciler({
    async load() {
      sequence.push("GET");
      loadCount += 1;
      return [current];
    },
    async remove() {},
    async update() {
      sequence.push("PATCH");
      throw apiError;
    },
    async create() {},
  });

  await assert.rejects(
    reconciler.replaceForClass("10", [assignment({ teacherId: "999", weeklyPeriods: 4 })]),
    (error) => {
      assert.ok(error instanceof ClassAssignmentPartialFailureError);
      assert.equal(error.cause, apiError);
      assert.deepEqual(error.serverAssignments, [current]);
      return true;
    },
  );
  assert.equal(loadCount, 2);
  assert.deepEqual(sequence, ["GET", "PATCH", "GET"]);
});

test("save resolves only after the final server refetch completes", async () => {
  let resolveFinalLoad;
  let loadCount = 0;
  let resolved = false;
  const reconciler = new ClassAssignmentReconciler({
    async load() {
      loadCount += 1;
      if (loadCount === 1) return [];
      return new Promise((resolve) => {
        resolveFinalLoad = resolve;
      });
    },
    async remove() {},
    async update() {},
    async create() {},
  });

  const save = reconciler.replaceForClass("10", []).then((result) => {
    resolved = true;
    return result;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(resolved, false);

  resolveFinalLoad([]);
  assert.deepEqual(await save, []);
  assert.equal(resolved, true);
});
