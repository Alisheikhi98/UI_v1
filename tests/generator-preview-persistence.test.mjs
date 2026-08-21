import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

class MemorySessionStorage {
  #values = new Map();

  get length() {
    return this.#values.size;
  }

  key(index) {
    return [...this.#values.keys()][index] ?? null;
  }

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }
}

globalThis.window = {
  sessionStorage: new MemorySessionStorage(),
  addEventListener() {},
  removeEventListener() {},
};

const {
  clearAllGeneratorPreviewReferences,
  clearGeneratorConflictReport,
  clearGeneratorPreviewReference,
  formatGeneratorPreviewTime,
  readGeneratorConflictReport,
  readGeneratorPreviewReference,
  saveGeneratorConflictReport,
  saveGeneratorPreviewReference,
} = await import("../src/lib/generator-preview-session.ts");

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

const firstReference = {
  schoolId: "3",
  candidateId: "77",
  generatedAt: "2026-08-21T18:05:00+03:30",
};

test("current Candidate reference survives route remount and stays user/School isolated", () => {
  saveGeneratorPreviewReference("12", firstReference);

  assert.deepEqual(readGeneratorPreviewReference("12", "3"), firstReference);
  assert.equal(readGeneratorPreviewReference("12", "4"), null);
  assert.equal(readGeneratorPreviewReference("13", "3"), null);
  assert.equal(window.sessionStorage.length, 1);
});

test("successful replacement preserves server identity and dismiss remains UI-only", () => {
  const replacement = {
    schoolId: "3",
    candidateId: "81",
    generatedAt: "2026-08-21T19:10:00+03:30",
  };
  saveGeneratorPreviewReference("12", replacement);
  assert.deepEqual(readGeneratorPreviewReference("12", "3"), replacement);

  clearGeneratorPreviewReference("12", "3");
  assert.equal(readGeneratorPreviewReference("12", "3"), null);
});

test("logout cleanup removes every user-scoped Generator pointer", () => {
  saveGeneratorPreviewReference("12", firstReference);
  saveGeneratorPreviewReference("13", { ...firstReference, schoolId: "4", candidateId: "90" });
  clearAllGeneratorPreviewReferences();
  assert.equal(readGeneratorPreviewReference("12", "3"), null);
  assert.equal(readGeneratorPreviewReference("13", "4"), null);
});

test("invalid persisted data fails closed and generation time uses the stored timestamp", () => {
  window.sessionStorage.setItem("generator-preview:v1:12:3", "not-json");
  assert.equal(readGeneratorPreviewReference("12", "3"), null);
  assert.notEqual(formatGeneratorPreviewTime(firstReference.generatedAt), "زمان تولید ثبت نشده");
  assert.equal(formatGeneratorPreviewTime("invalid"), "زمان تولید ثبت نشده");
});

test("INFEASIBLE report survives remount, stays scoped, and dismisses locally", () => {
  const report = {
    schoolId: "3",
    reportedAt: "2026-08-21T12:00:00.000Z",
    diagnostics: [
      {
        type: "teacher-conflict",
        teacherId: "20",
        day: "Saturday",
        slot: 3,
        lessons: [
          { courseId: "40", classId: "10" },
          { courseId: "41", classId: "11" },
        ],
      },
    ],
  };
  saveGeneratorConflictReport("12", report);

  assert.deepEqual(readGeneratorConflictReport("12", "3"), report);
  assert.equal(readGeneratorConflictReport("12", "4"), null);
  assert.equal(readGeneratorConflictReport("13", "3"), null);

  clearGeneratorConflictReport("12", "3");
  assert.equal(readGeneratorConflictReport("12", "3"), null);
});

test("Generator restores through Candidate GET and replaces the pointer only after success", async () => {
  const [route, queries, preview, session, authSession] = await Promise.all([
    readSource("../src/routes/dashboard.generator.tsx"),
    readSource("../src/lib/generator-queries.ts"),
    readSource("../src/components/generator/generated-schedule-preview.tsx"),
    readSource("../src/lib/generator-preview-session.ts"),
    readSource("../src/lib/auth-session.ts"),
  ]);

  assert.match(route, /useGeneratorPreviewReference/);
  assert.match(route, /const generatedScheduleId = previewReference\?\.candidateId/);
  assert.match(route, /queryClient\.getQueryData<ScheduleCandidateDetail>/);
  assert.match(route, /savePreviewReference\(candidate\.id, candidate\.createdAt\)/);
  assert.doesNotMatch(route, /setGeneratedScheduleId\(null\)/);
  assert.match(queries, /scheduleApi\.getCandidate/);
  assert.match(queries, /staleTime: 60_000/);
  assert.match(queries, /error\.status === 404/);
  assert.doesNotMatch(session, /localStorage|access_token|ScheduledLesson/);
  assert.match(authSession, /clearAllGeneratorPreviewReferences\(\)/);
  assert.match(preview, /برنامه تولیدشده/);
  assert.match(preview, /formatGeneratorPreviewTime\(generatedAt\)/);
  assert.match(preview, /aria-label="بستن پیش‌نمایش برنامه"/);
});

test("failure, confirmation, and dismiss preserve the intended Candidate lifecycle", async () => {
  const route = await readSource("../src/routes/dashboard.generator.tsx");
  const startGeneration =
    route.match(/const startGeneration = async \(\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";
  const dismiss =
    route.match(/const dismissGeneratedPreview = \(\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";

  assert.match(startGeneration, /await generate\.mutateAsync/);
  assert.match(startGeneration, /savePreviewReference/);
  assert.doesNotMatch(startGeneration, /clearPreviewReference|sessionStorage\.removeItem/);
  assert.match(route, /generatedSchedule\.data\.selected \|\| confirmedScheduleId/);
  assert.match(dismiss, /clearPreviewReference\(\)/);
  assert.doesNotMatch(dismiss, /scheduleApi|remove|delete|confirm/);
  assert.match(route, /missingGeneratedCandidate/);
  assert.match(route, /clearUnavailableCandidateReference/);
});
