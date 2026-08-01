import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ClassAssignmentPartialFailureError,
  ClassAssignmentPersistenceVerificationError,
  ClassAssignmentReconciler,
} from "../src/lib/api/class-assignment-reconciliation.ts";
import {
  classAssignmentsPath,
  mapAssignmentCreatePayload,
} from "../src/lib/api/class-assignment-requests.ts";
import { initializeClassAssignmentDraft } from "../src/lib/class-assignment-draft.ts";
import { canLoadClassAssignments } from "../src/lib/class-assignment-query.ts";
import { mapClassAssignment } from "../src/lib/api/mappers.ts";

const desiredAssignment = {
  classId: "12",
  courseId: "34",
  teacherId: "56",
  weeklyPeriods: 4,
};

function createPersistentServer() {
  let assignments = [];
  const requests = [];

  return {
    requests,
    async reload(classId) {
      requests.push(`GET:${classId}`);
      return structuredClone(assignments.filter((assignment) => assignment.classId === classId));
    },
    operations: {
      async load(classId) {
        requests.push(`GET:${classId}`);
        return structuredClone(assignments.filter((assignment) => assignment.classId === classId));
      },
      async remove(classId, assignmentId) {
        requests.push(`DELETE:${classId}:${assignmentId}`);
        assignments = assignments.filter((assignment) => assignment.id !== assignmentId);
      },
      async update(classId, operation) {
        requests.push(`PATCH:${classId}:${operation.assignmentId}`);
        assignments = assignments.map((assignment) =>
          assignment.id === operation.assignmentId
            ? {
                ...assignment,
                teacherId: operation.teacherId,
                weeklyPeriods: operation.weeklyPeriods,
              }
            : assignment,
        );
      },
      async create(classId, operation) {
        requests.push(`POST:${classId}`);
        assignments.push({
          id: `server-${assignments.length + 1}`,
          classId,
          ...operation,
        });
      },
    },
  };
}

test("a new assignment persists and initializes a fresh dialog after full reload", async () => {
  const server = createPersistentServer();
  const reconciler = new ClassAssignmentReconciler(server.operations);

  const finalGet = await reconciler.replaceForClass("12", [desiredAssignment]);
  const afterReload = await server.reload("12");
  const draft = initializeClassAssignmentDraft({
    classId: "12",
    assignments: afterReload,
    queryStatus: "success",
    initializedClassId: null,
  });

  assert.deepEqual(server.requests, ["GET:12", "POST:12", "GET:12", "GET:12"]);
  assert.equal(finalGet[0].id, "server-1");
  assert.deepEqual(afterReload, finalGet);
  assert.equal(draft[0].draftId, "server-1");
  assert.equal(draft[0].courseId, "34");
  assert.equal(draft[0].teacherId, "56");
  assert.equal(draft[0].weeklyPeriods, 4);
});

test("no success is possible when POST is skipped and the final GET omits the row", async () => {
  const reconciler = new ClassAssignmentReconciler({
    async load() {
      return [];
    },
    async remove() {},
    async update() {},
    async create() {
      // Simulates a request adapter that resolved without persisting.
    },
  });

  await assert.rejects(
    reconciler.replaceForClass("12", [desiredAssignment]),
    (error) =>
      error instanceof ClassAssignmentPartialFailureError &&
      error.cause instanceof ClassAssignmentPersistenceVerificationError &&
      error.serverAssignments.length === 0,
  );
});

test("a failed assignment POST keeps the save in the partial-failure path", async () => {
  const postError = new Error("Assignment POST failed.");
  let loadCount = 0;
  const reconciler = new ClassAssignmentReconciler({
    async load() {
      loadCount += 1;
      return [];
    },
    async remove() {},
    async update() {},
    async create() {
      throw postError;
    },
  });

  await assert.rejects(
    reconciler.replaceForClass("12", [desiredAssignment]),
    (error) =>
      error instanceof ClassAssignmentPartialFailureError &&
      error.cause === postError &&
      error.serverAssignments.length === 0,
  );
  assert.equal(loadCount, 2);
});

test("assignment requests use one school/class scope and the exact FastAPI payload", () => {
  assert.equal(classAssignmentsPath("7", "12"), "/schools/7/classes/12/assignments");
  assert.deepEqual(mapAssignmentCreatePayload(desiredAssignment), {
    course_id: 34,
    teacher_id: 56,
    slots_per_week: 4,
  });
});

test("backend assignment IDs and foreign keys map to canonical string IDs", () => {
  const mapped = mapClassAssignment({
    id: 901,
    school_id: 7,
    class_id: 12,
    course_id: 34,
    course_name: "فیزیک",
    teacher_id: 56,
    teacher_name: "معلم",
    slots_per_week: 4,
    active: true,
    created_at: "2026-07-31T00:00:00Z",
    updated_at: "2026-07-31T00:00:00Z",
  });

  assert.deepEqual(mapped, {
    id: "901",
    classId: "12",
    courseId: "34",
    teacherId: "56",
    weeklyPeriods: 4,
  });
});

test("loading and error states never initialize or overwrite the assignment draft", () => {
  const serverAssignment = { id: "901", ...desiredAssignment };

  assert.equal(
    initializeClassAssignmentDraft({
      classId: "12",
      assignments: [],
      queryStatus: "pending",
      initializedClassId: null,
    }),
    null,
  );
  assert.equal(
    initializeClassAssignmentDraft({
      classId: "12",
      assignments: [],
      queryStatus: "error",
      initializedClassId: null,
    }),
    null,
  );
  assert.deepEqual(
    initializeClassAssignmentDraft({
      classId: "12",
      assignments: [serverAssignment],
      queryStatus: "success",
      initializedClassId: null,
    }),
    [{ ...serverAssignment, draftId: "901" }],
  );
});

test("assignment queries require a valid class and, in API mode, a school", () => {
  assert.equal(canLoadClassAssignments(false, null, ["12"]), false);
  assert.equal(canLoadClassAssignments(false, "7", []), false);
  assert.equal(canLoadClassAssignments(false, "7", ["draft-class"]), false);
  assert.equal(canLoadClassAssignments(false, "0", ["12"]), false);
  assert.equal(canLoadClassAssignments(false, "7", ["12"]), true);
  assert.equal(canLoadClassAssignments(true, null, ["12"]), true);
});

test("API-mode assignment loading has no mock repository fallback", async () => {
  const [apiSource, querySource, classManagementSource] = await Promise.all([
    readFile(new URL("../src/lib/api/api-repositories.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/mock-queries.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/class-management.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(apiSource, /mock-repositor/i);
  assert.match(querySource, /initialData:\s*scopedInitialData/);
  assert.match(querySource, /useMockApi\s*&&\s*classIds\.length/);
  assert.match(classManagementSource, /filters:\s*activeClassId\s*\?\s*\{\s*classId:/);
});
