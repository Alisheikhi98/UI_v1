import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";

process.env.VITE_API_BASE_URL = "http://generator.test";
const storage = new Map([["access_token", "generator-test-token"]]);
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
  dispatchEvent: () => true,
};

const { scheduleApi } = await import("../src/lib/api/schedule-api.ts");
const { ApiError } = await import("../src/lib/api/client.ts");
const { getGeneratorErrorMessage } = await import("../src/lib/generator-errors.ts");
const { deriveGeneratorReadiness } = await import("../src/lib/scheduler.ts");
const { setAccessToken } = await import("../src/lib/auth-token.ts");
const originalFetch = globalThis.fetch;
const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

after(() => {
  globalThis.fetch = originalFetch;
  delete globalThis.window;
});

const classes = [{ id: "10", name: "دهم ریاضی", gradeId: "10", majorId: "2", studentCapacity: 0 }];
const teachers = [
  { id: "20", name: "علی احمدی", email: "", phone: "", courseIds: [], status: "active" },
];
const assignments = [
  { id: "30", classId: "10", courseId: "40", teacherId: "20", weeklyPeriods: 3 },
];
const daySlotGroups = [
  {
    dayId: 1,
    dayName: "Saturday",
    slots: [1, 2, 3, 4].map((slotNumber) => ({
      id: String(slotNumber),
      schoolId: "1",
      dayId: 1,
      slotNumber,
      title: null,
      startTime: null,
      endTime: null,
      active: true,
    })),
  },
];

test("readiness retains only solver-backed grouped checks", () => {
  const readiness = deriveGeneratorReadiness({
    classes,
    teachers,
    assignments,
    daySlotGroups,
    availabilityByTeacher: new Map([["20", ["1", "2", "3"]]]),
  });
  assert.equal(readiness.ready, true);
  assert.deepEqual(
    readiness.items.map((item) => item.id),
    ["school-calendar", "assignments", "teacher-availability", "weekly-capacity"],
  );
  assert.equal(
    readiness.items.some((item) => item.id === "courses"),
    false,
  );
  assert.equal(
    readiness.items.some((item) => item.id === "teachers"),
    false,
  );
});

test("missing calendar, assignments, and insufficient availability produce actionable links", () => {
  const empty = deriveGeneratorReadiness({
    classes,
    teachers,
    assignments: [],
    daySlotGroups: [],
    availabilityByTeacher: new Map(),
  });
  assert.equal(empty.ready, false);
  assert.deepEqual(empty.issues.map((issue) => issue.actionHref).sort(), [
    "/dashboard/classes",
    "/dashboard/schools",
  ]);
  const assignmentIssue = empty.issues.find((issue) => issue.id === "assignments-empty-10");
  assert.equal(assignmentIssue?.title, classes[0].name);
  assert.equal(assignmentIssue?.message, "درس و معلم ثبت نشده است.");
  assert.equal(assignmentIssue?.actionLabel, "تکمیل مدیریت کلاس");
  const assignmentItem = empty.items.find((item) => item.id === "assignments");
  assert.equal(assignmentItem?.label, "دروس و معلمان کلاس‌ها");
  assert.equal(
    assignmentItem?.value,
    "هنوز اطلاعات درس و معلم لازم برای تولید برنامه ثبت نشده است.",
  );
  assert.equal(assignmentItem?.status, "needs-attention");

  const insufficient = deriveGeneratorReadiness({
    classes,
    teachers,
    assignments,
    daySlotGroups,
    availabilityByTeacher: new Map([["20", ["1"]]]),
  });
  assert.equal(insufficient.ready, false);
  assert.equal(insufficient.issues[0].actionHref, "/dashboard/teachers");
  assert.match(insufficient.issues[0].message, /۳/);
});

test("authoritative assignment readiness blocks generation and updates after refetch", async () => {
  const withoutAssignments = deriveGeneratorReadiness({
    classes,
    teachers,
    assignments: [],
    daySlotGroups,
    availabilityByTeacher: new Map(),
  });
  let schedulePostCount = 0;
  globalThis.fetch = async () => {
    schedulePostCount += 1;
    return Response.json({});
  };
  if (withoutAssignments.ready) await scheduleApi.generate("9");
  assert.equal(withoutAssignments.ready, false);
  assert.equal(schedulePostCount, 0);

  const afterAuthoritativeRefetch = deriveGeneratorReadiness({
    classes,
    teachers,
    assignments,
    daySlotGroups,
    availabilityByTeacher: new Map([["20", ["1", "2", "3"]]]),
  });
  assert.equal(afterAuthoritativeRefetch.ready, true);
  assert.equal(
    afterAuthoritativeRefetch.items.find((item) => item.id === "assignments")?.value,
    "اطلاعات درس‌ها و معلمان برای تولید برنامه آماده است.",
  );
  assert.notEqual(
    afterAuthoritativeRefetch.items.find((item) => item.id === "assignments")?.value,
    "همه کلاس‌ها دارای درس و معلم هستند.",
  );
});

test("generation uses the exact synchronous FastAPI contract and preserves backend IDs", async () => {
  setAccessToken("generator-test-token");
  let request;
  globalThis.fetch = async (input, init = {}) => {
    request = {
      url: new URL(String(input)),
      method: init.method,
      body: JSON.parse(String(init.body)),
    };
    return Response.json({
      success: true,
      status: "FEASIBLE",
      code: "SCHEDULE_GENERATED",
      message: "ok",
      candidate_id: 77,
      total_gap: 2,
      details: {},
      lessons: [
        {
          assignment_id: 30,
          day_slot_id: 1,
          teacher_id: 20,
          class_id: 10,
          course_id: 40,
          day: "Saturday",
          slot: 1,
        },
      ],
    });
  };
  const result = await scheduleApi.generate("9");
  assert.equal(request.url.pathname, "/schedule/9");
  assert.equal(request.method, "POST");
  assert.deepEqual(request.body, { minimize_gaps: true });
  assert.equal(result.candidateId, "77");
  assert.equal(result.lessons[0].daySlotId, "1");
});

test("generated schedule detail uses the school-scoped authoritative endpoint", async () => {
  setAccessToken("generator-test-token");
  const paths = [];
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    paths.push(path);
    return Response.json({
      candidate_id: 77,
      status: "FEASIBLE",
      total_gap: 2,
      selected: false,
      created_at: "2026-08-14T10:00:00Z",
      lessons: [],
    });
  };
  assert.equal((await scheduleApi.getCandidate("9", "77")).id, "77");
  assert.deepEqual(paths, ["/schedule/9/candidates/77"]);
});

test("busy, frequency-limit, and scheduler-input errors are distinguished safely", () => {
  const busy = new ApiError("raw", 429, {
    detail: "Another scheduling operation is already running.",
  });
  const limited = new ApiError(
    "raw",
    429,
    { detail: "Too many scheduling requests. Try again later." },
    [],
    45,
  );
  const missingAssignments = new ApiError("raw", 422, {
    code: "SCHEDULER_ASSIGNMENTS_NOT_FOUND",
    message: "No course assignments found.",
  });

  assert.equal(
    getGeneratorErrorMessage(busy),
    "یک عملیات تولید برنامه برای این مدرسه در حال اجراست. پس از پایان آن دوباره تلاش کنید.",
  );
  assert.match(getGeneratorErrorMessage(limited), /۴۵ ثانیه/);
  assert.equal(
    getGeneratorErrorMessage(missingAssignments),
    "برای تولید برنامه، ابتدا درس‌ها و معلمان کلاس‌ها را کامل کنید.",
  );
  assert.doesNotMatch(getGeneratorErrorMessage(missingAssignments), /No course assignments/);
});

test("confirmation and published timetable use the exact FastAPI contracts", async () => {
  setAccessToken("generator-test-token");
  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    const path = new URL(String(input)).pathname;
    requests.push({ path, method: init.method ?? "GET" });
    if (path.endsWith("/confirm")) {
      return Response.json({
        success: true,
        candidate_id: 77,
        saved_lessons: 1,
        message: "confirmed",
      });
    }
    return Response.json({
      class_id: 10,
      class_name: "دهم ریاضی",
      items: [
        {
          schedule_id: 90,
          day_slot_id: 1,
          day_id: 2,
          day_name: "Saturday",
          slot_number: 1,
          start_time: "08:00:00",
          end_time: "08:45:00",
          course_id: 40,
          course_name: "فیزیک",
          teacher_id: 20,
          teacher_name: "علی احمدی",
        },
      ],
    });
  };

  const confirmation = await scheduleApi.confirmCandidate("9", "77");
  const published = await scheduleApi.getClassSchedule("9", "10");
  assert.deepEqual(confirmation, { candidateId: "77", savedLessons: 1 });
  assert.equal(published.items[0].id, "90");
  assert.equal(published.items[0].courseName, "فیزیک");
  assert.deepEqual(requests, [
    { path: "/schedule/9/candidates/77/confirm", method: "POST" },
    { path: "/schools/9/classes/10/schedule", method: "GET" },
  ]);
});

test("successful generation renders one bounded School preview from the candidate", async () => {
  const [route, progress, compactPreview, schoolPreview, fullPreview, queries, readinessComponent] =
    await Promise.all([
      readSource("../src/routes/dashboard.generator.tsx"),
      readSource("../src/components/generator/generation-progress.tsx"),
      readSource("../src/components/generator/generated-schedule-preview.tsx"),
      readSource("../src/components/generator/timetable-preview.tsx"),
      readSource("../src/components/generator/candidate-preview-dialog.tsx"),
      readSource("../src/lib/generator-queries.ts"),
      readSource("../src/components/generator/generator-readiness.tsx"),
    ]);
  assert.match(route, /generate\.isPending/);
  assert.match(route, /!readiness\.data\.ready/);
  assert.match(route, /await generate\.mutateAsync\(\)/);
  assert.match(route, /generationInFlight\.current/);
  assert.equal(route.match(/generate\.mutateAsync\(\)/g)?.length, 1);
  assert.doesNotMatch(route, /demoCandidates|setTimeout|activeStep/);
  assert.doesNotMatch(progress, /setTimeout|activeStep/);
  assert.match(route, /<GeneratedSchedulePreview/);
  assert.match(route, /schedule=\{generatedSchedule\.data\}/);
  assert.doesNotMatch(route, /CandidateList|useScheduleCandidates/);
  assert.match(compactPreview, /پیش‌نمایش برنامه مدرسه/);
  assert.match(compactPreview, /candidate=\{schedule\}/);
  assert.match(compactPreview, /compact/);
  assert.doesNotMatch(compactPreview, /Select|classId|setClassId/);
  assert.match(schoolPreview, /scheduledClasses\.map/);
  assert.match(schoolPreview, /activeDays\.map/);
  assert.match(schoolPreview, /day\.slots\.map/);
  assert.match(schoolPreview, /candidate\.lessons\.find/);
  assert.match(schoolPreview, /item\.classId === classItem\.id/);
  assert.match(schoolPreview, /courseNames\.get\(lesson\.courseId\)/);
  assert.match(schoolPreview, /teacherNames\.get\(lesson\.teacherId\)/);
  assert.match(schoolPreview, /max-h-80/);
  assert.match(schoolPreview, /overflow-auto/);
  assert.match(schoolPreview, /sticky top-0/);
  assert.doesNotMatch(schoolPreview, /Select|Tabs|selectedClass|selectedTeacher|PreviewMode/);
  assert.match(compactPreview, /انتخاب و ثبت برنامه/);
  assert.match(compactPreview, /onClick=\{onConfirm\}/);
  assert.match(compactPreview, /confirming \|\| confirmed/);
  assert.doesNotMatch(compactPreview, /score|bestCandidate|distributionScore/);
  assert.doesNotMatch(fullPreview, /CandidateAnalysis|acceptedLocally|onAccept|Select|Tabs/);
  assert.match(queries, /repositoryQueryKeys\.scheduleCandidate\(schoolId/);
  assert.match(queries, /signal/);
  assert.match(queries, /scheduleApi\.confirmCandidate/);
  assert.match(queries, /fetchPublishedClassSchedules/);
  assert.doesNotMatch(compactPreview, /publishedSchedule|classSchedules/);
  assert.match(route, /replacementWarningOpen/);
  assert.match(route, /await confirm\.mutateAsync/);
  assert.match(route, /confirmInFlight\.current/);
  assert.match(route, /finally/);
  assert.match(route, /to: "\/dashboard\/timetable"/);
  assert.match(readinessComponent, /disabled=\{!ready \|\| pending\}/);
  assert.match(readinessComponent, /issue\.actionLabel \?\? "رفع مشکل"/);
});

test("comparison and permanent analysis surfaces are absent", async () => {
  const [route, compactPreview] = await Promise.all([
    readSource("../src/routes/dashboard.generator.tsx"),
    readSource("../src/components/generator/generated-schedule-preview.tsx"),
  ]);
  assert.doesNotMatch(route, /برنامه‌های پیشنهادی|CandidateList|CandidateAnalysis/);
  assert.doesNotMatch(compactPreview, /تحلیل برنامه|بهترین گزینه/);
  assert.match(compactPreview, /مشاهده برنامه کامل/);
  assert.match(route, /result\.status === "INFEASIBLE"/);
  assert.match(route, /kind="no-feasible"/);
});

test("API-mode Generator has no demo or mock fallback and errors stay localized", async () => {
  const [route, queries, errors] = await Promise.all([
    readSource("../src/routes/dashboard.generator.tsx"),
    readSource("../src/lib/generator-queries.ts"),
    readSource("../src/lib/generator-errors.ts"),
  ]);
  assert.doesNotMatch(route, /generator-demo|demoCandidates|demoReadinessItems/);
  assert.match(queries, /scheduleApi\.generate/);
  assert.doesNotMatch(queries, /demoCandidates/);
  assert.doesNotMatch(route, /error\.message/);
  assert.match(errors, /ارتباط با سرور برقرار نشد/);
});
