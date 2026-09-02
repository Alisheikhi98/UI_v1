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
const { parseScheduleDiagnostics, presentScheduleDiagnostics } =
  await import("../src/lib/schedule-diagnostics.ts");
const {
  DEFAULT_SCHEDULE_GENERATION_SETTINGS,
  deriveGeneratorReadiness,
  getMaximumPeriodsPerDay,
  parseScheduleGenerationSettings,
} = await import("../src/lib/scheduler.ts");
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
const courses = [
  {
    id: "40",
    name: "فیزیک",
    active: true,
    gradeId: "10",
    majorId: "2",
    category: "specialized",
    code: "physics",
    weeklyHours: 3,
    color: "blue",
  },
  {
    id: "41",
    name: "ریاضی",
    active: true,
    gradeId: "10",
    majorId: "2",
    category: "specialized",
    code: "math",
    weeklyHours: 3,
    color: "green",
  },
];
const diagnosticAssignments = [
  { id: "30", classId: "10", courseId: "40", teacherId: "20", weeklyPeriods: 3 },
  { id: "31", classId: "11", courseId: "41", teacherId: "20", weeklyPeriods: 3 },
  { id: "32", classId: "10", courseId: "41", teacherId: "21", weeklyPeriods: 3 },
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
  if (withoutAssignments.ready)
    await scheduleApi.generate("9", DEFAULT_SCHEDULE_GENERATION_SETTINGS);
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
  const result = await scheduleApi.generate("9", {
    minimizeGaps: false,
    maxSameCourseSlotsPerDay: 2,
  });
  assert.equal(request.url.pathname, "/schedule/9");
  assert.equal(request.method, "POST");
  assert.deepEqual(request.body, {
    minimize_gaps: false,
    max_same_course_slots_per_day: 2,
  });
  assert.equal(result.candidateId, "77");
  assert.equal(result.lessons[0].daySlotId, "1");
  assert.deepEqual(result.diagnostics, []);
});

test("Schedule API detects the HTTP 200 infeasible contract and maps its diagnostics", async () => {
  setAccessToken("generator-test-token");
  globalThis.fetch = async () =>
    Response.json({
      success: false,
      status: "INFEASIBLE",
      code: "SCHEDULE_INFEASIBLE",
      message:
        "Selected relaxation — Teacher ID 20 conflict at Day Saturday Slot 3 between: Course ID 40 (Class 10)",
      candidate_id: null,
      total_gap: 0,
      details: {
        diagnostic: {
          explanation_type: "one_minimum_relaxation",
          solution_exists: true,
          selected_relaxations: { teacher_conflict_slots: 1 },
        },
      },
      lessons: [],
    });

  const result = await scheduleApi.generate("9", DEFAULT_SCHEDULE_GENERATION_SETTINGS);
  assert.equal(result.success, false);
  assert.equal(result.status, "INFEASIBLE");
  assert.equal(result.code, "SCHEDULE_INFEASIBLE");
  assert.equal(result.candidateId, null);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].type, "teacher-conflict");
});

test("availability repair uses the exact preview endpoint, payload, and typed additions", async () => {
  setAccessToken("generator-test-token");
  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    requests.push({
      path: new URL(String(input)).pathname,
      method: init.method,
      body: JSON.parse(String(init.body)),
    });
    return Response.json({
      success: true,
      status: "REPAIR_AVAILABLE",
      code: "AVAILABILITY_REPAIR_FOUND",
      message: "raw repair explanation",
      lessons: [
        {
          assignment_id: 30,
          day_slot_id: 2,
          teacher_id: 20,
          class_id: 10,
          course_id: 40,
          day: "Saturday",
          slot: 2,
        },
      ],
      total_gap: 0,
      details: {
        repair_type: "teacher_availability_additions",
        minimum_changes: 1,
        minimum_changes_proven: true,
        proposed_availability_additions: [
          { teacher_id: 20, day_slot_id: 2, day: "Saturday", slot: 2 },
        ],
      },
    });
  };

  const result = await scheduleApi.repairAvailability("9", {
    minimizeGaps: false,
    maxSameCourseSlotsPerDay: 2,
  });
  assert.deepEqual(requests, [
    {
      path: "/schedule/9/repair-availability",
      method: "POST",
      body: { minimize_gaps: false, max_same_course_slots_per_day: 2 },
    },
  ]);
  assert.equal(result.status, "REPAIR_AVAILABLE");
  assert.equal(result.repairType, "teacher_availability_additions");
  assert.equal(result.minimumChanges, 1);
  assert.equal(result.minimumChangesProven, true);
  assert.deepEqual(result.proposedAvailabilityAdditions, [
    { teacherId: "20", daySlotId: "2", day: "Saturday", slot: 2 },
  ]);
  assert.equal(result.lessons[0].daySlotId, "2");
  assert.doesNotMatch(JSON.stringify(result), /raw repair explanation/);
});

test("repair result safely maps already-feasible and no-repair outcomes", async () => {
  setAccessToken("generator-test-token");
  const responses = [
    {
      success: true,
      status: "ALREADY_FEASIBLE",
      code: "SCHEDULE_ALREADY_FEASIBLE",
      message: "raw",
      lessons: [],
      total_gap: 0,
      details: {
        repair_type: "teacher_availability_additions",
        minimum_changes: 0,
        minimum_changes_proven: true,
        proposed_availability_additions: [],
      },
    },
    {
      success: false,
      status: "NO_AVAILABILITY_REPAIR",
      code: "AVAILABILITY_REPAIR_NOT_FOUND",
      message: "raw",
      lessons: [],
      total_gap: 0,
      details: { stage: "availability_repair" },
    },
  ];
  globalThis.fetch = async () => Response.json(responses.shift());

  const already = await scheduleApi.repairAvailability("9", DEFAULT_SCHEDULE_GENERATION_SETTINGS);
  const unavailable = await scheduleApi.repairAvailability(
    "9",
    DEFAULT_SCHEDULE_GENERATION_SETTINGS,
  );
  assert.equal(already.status, "ALREADY_FEASIBLE");
  assert.deepEqual(already.proposedAvailabilityAdditions, []);
  assert.equal(unavailable.status, "NO_AVAILABILITY_REPAIR");
  assert.equal(unavailable.success, false);
  assert.deepEqual(unavailable.proposedAvailabilityAdditions, []);
});

test("scheduler controls use backend defaults and a dynamic School-calendar maximum", () => {
  assert.deepEqual(DEFAULT_SCHEDULE_GENERATION_SETTINGS, {
    minimizeGaps: true,
    maxSameCourseSlotsPerDay: null,
  });
  assert.equal(getMaximumPeriodsPerDay(daySlotGroups), 4);
  assert.equal(
    getMaximumPeriodsPerDay([
      daySlotGroups[0],
      {
        ...daySlotGroups[0],
        dayId: 2,
        slots: [...daySlotGroups[0].slots, { ...daySlotGroups[0].slots[0], id: "5" }],
      },
    ]),
    5,
  );

  assert.deepEqual(
    parseScheduleGenerationSettings({
      minimizeGaps: true,
      maxSameCourseSlotsPerDay: "",
      maximumPeriodsPerDay: 4,
    }),
    {
      settings: { minimizeGaps: true, maxSameCourseSlotsPerDay: null },
      error: null,
    },
  );
  assert.deepEqual(
    parseScheduleGenerationSettings({
      minimizeGaps: false,
      maxSameCourseSlotsPerDay: "1",
      maximumPeriodsPerDay: 4,
    }).settings,
    { minimizeGaps: false, maxSameCourseSlotsPerDay: 1 },
  );
});

test("scheduler repetition validation rejects zero, decimals, and values above daily capacity", () => {
  for (const value of ["0", "1.5", "invalid"]) {
    const result = parseScheduleGenerationSettings({
      minimizeGaps: true,
      maxSameCourseSlotsPerDay: value,
      maximumPeriodsPerDay: 4,
    });
    assert.equal(result.settings, null);
    assert.ok(result.error);
  }

  const aboveMaximum = parseScheduleGenerationSettings({
    minimizeGaps: true,
    maxSameCourseSlotsPerDay: "5",
    maximumPeriodsPerDay: 4,
  });
  assert.equal(aboveMaximum.settings, null);
  assert.match(aboveMaximum.error, /۴/);
});

test("infeasible backend lines map to typed diagnostics without exposing raw solver text", () => {
  const rawMessage = [
    "=== MINIMUM-RELAXATION EXPLANATION ===",
    "Selected relaxation — Assignment shortage: assignment ID 30, teacher ID 20 teaching course ID 40 for class 10 requires 3 slots but the diagnostic could assign only 2; unmet slots: 1.",
    "Selected relaxation — Teacher ID 20 conflict at Day Saturday Slot 3 between: Course ID 40 (Class 10), Course ID 41 (Class 11)",
    "Selected relaxation — Class 10 conflict at Day Saturday Slot 2 between: Course ID 40 (Teacher ID 20), Course ID 41 (Teacher ID 21)",
    "Selected relaxation — Daily course limit conflict: Class 10, Course ID 40, Day Saturday needs 1 slot(s) above the configured limit of 1.",
    "internal solver text that must not be rendered",
  ].join("\n");
  const diagnostics = parseScheduleDiagnostics("INFEASIBLE", rawMessage, {});
  assert.deepEqual(
    diagnostics.map((item) => item.type),
    ["assignment-shortage", "teacher-conflict", "class-conflict", "daily-course-limit"],
  );
  assert.equal(diagnostics[1].teacherId, "20");
  assert.equal(diagnostics[1].day, "Saturday");
  assert.equal(diagnostics[1].slot, 3);
  assert.equal(diagnostics[1].lessons.length, 2);

  const presentations = presentScheduleDiagnostics(diagnostics, {
    teachers,
    classes,
    courses,
    daySlotGroups,
    assignments: diagnosticAssignments,
  });
  assert.match(JSON.stringify(presentations), /علی احمدی/);
  assert.match(JSON.stringify(presentations), /دهم ریاضی/);
  assert.match(JSON.stringify(presentations), /فیزیک/);
  assert.equal(presentations[1].timeLabel, "شنبه — زنگ ۳");
  assert.deepEqual(presentations[1].teachers, ["علی احمدی"]);
  assert.equal(presentations[1].resolved, false);
  assert.match(presentations[1].reason, /چند کلاس/);
  assert.doesNotMatch(JSON.stringify(presentations), /internal solver|MINIMUM-RELAXATION/);
});

test("a previous conflict resolves only when its exact assignment relationship changes", () => {
  const diagnostic = {
    type: "teacher-conflict",
    teacherId: "20",
    day: "Saturday",
    slot: 3,
    lessons: [
      { courseId: "40", classId: "10" },
      { courseId: "41", classId: "11" },
    ],
  };
  const unresolved = presentScheduleDiagnostics([diagnostic], {
    teachers,
    classes,
    courses,
    daySlotGroups,
    assignments: diagnosticAssignments,
  })[0];
  const resolved = presentScheduleDiagnostics([diagnostic], {
    teachers,
    classes,
    courses,
    daySlotGroups,
    assignments: diagnosticAssignments.filter((item) => item.id !== "31"),
  })[0];

  assert.equal(unresolved.resolved, false);
  assert.equal(resolved.resolved, true);
});

test("multiple, partial, aggregate, and unknown diagnostics fail safely", () => {
  const partial = parseScheduleDiagnostics(
    "INFEASIBLE",
    "Selected relaxation — Teacher ID 20 conflict at Day Saturday Slot 1 between: unavailable lesson details",
    {},
  );
  assert.equal(partial.length, 1);
  assert.equal(partial[0].type, "teacher-conflict");
  assert.deepEqual(partial[0].lessons, []);

  const aggregate = parseScheduleDiagnostics("INFEASIBLE", "unrecognized internal text", {
    diagnostic: {
      selected_relaxations: {
        unmet_assignment_slots: 2,
        teacher_conflict_slots: 1,
        class_conflict_slots: 0,
        daily_course_limit_slots: 0,
      },
    },
  });
  assert.equal(aggregate.length, 2);
  assert.deepEqual(
    aggregate.map((item) => item.type),
    ["aggregate", "aggregate"],
  );

  const unknown = parseScheduleDiagnostics("INFEASIBLE", "raw opaque failure", {});
  const presentation = presentScheduleDiagnostics(unknown, {
    teachers: [],
    classes: [],
    courses: [],
    daySlotGroups: [],
    assignments: [],
  });
  assert.deepEqual(unknown, [{ type: "unknown" }]);
  assert.match(presentation[0].reason, /جزئیات دقیق تداخل/);
  assert.doesNotMatch(JSON.stringify(presentation), /raw opaque failure/);
  assert.deepEqual(parseScheduleDiagnostics("VALIDATION_ERROR", "Selected relaxation —", {}), []);
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
  assert.match(route, /await generate\.mutateAsync\(generationSettings\.settings\)/);
  assert.match(route, /generationInFlight\.current/);
  assert.equal(route.match(/generate\.mutateAsync\(generationSettings\.settings\)/g)?.length, 1);
  assert.doesNotMatch(route, /demoCandidates|setTimeout|activeStep/);
  assert.match(progress, /LONG_RUNNING_STATUS_DELAY_MS = 9_000/);
  assert.match(progress, /window\.setTimeout/);
  assert.match(progress, /window\.clearTimeout/);
  assert.match(progress, /پردازش همچنان ادامه دارد؛ لطفاً صفحه را نبندید/);
  assert.match(route, /<GeneratedSchedulePreview/);
  assert.match(route, /timetable=\{generatedTimetable\}/);
  assert.doesNotMatch(route, /CandidateList|useScheduleCandidates/);
  assert.match(compactPreview, /برنامه تولیدشده/);
  assert.match(compactPreview, /timetable=\{timetable\}/);
  assert.match(compactPreview, /compact/);
  assert.doesNotMatch(compactPreview, /Select|classId|setClassId/);
  assert.match(schoolPreview, /timetable\.classes\.map/);
  assert.match(schoolPreview, /timetable\.days\.map/);
  assert.match(schoolPreview, /timetable\.periods\.map/);
  assert.match(schoolPreview, /entry\.courseName/);
  assert.match(schoolPreview, /teacherNames\.get\(entry\.teacherId\)/);
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
  assert.match(
    readinessComponent,
    /disabled=\{!ready \|\| pending \|\| operationLocked \|\| generationDisabled\}/,
  );
  assert.match(readinessComponent, /issue\.actionLabel \?\? "رفع مشکل"/);
  assert.match(readinessComponent, /grid gap-2 md:grid-cols-2 lg:grid-cols-4/);
  assert.doesNotMatch(readinessComponent, /xl:grid-cols-3|truncate text-sm font-medium/);
});

test("scheduler constraint controls stay compact and responsive on mobile", async () => {
  const [route, controls] = await Promise.all([
    readSource("../src/routes/dashboard.generator.tsx"),
    readSource("../src/components/generator/scheduler-constraint-controls.tsx"),
  ]);
  assert.match(route, /generationControls=/);
  assert.match(route, /getMaximumPeriodsPerDay\(readiness\.daySlotGroups\)/);
  assert.match(route, /generationDisabled=\{!generationSettings\.settings\}/);
  assert.match(controls, /sm:grid-cols-2/);
  assert.match(controls, /type="number"/);
  assert.match(controls, /min=\{1\}/);
  assert.match(controls, /max=\{maximumPeriodsPerDay > 0 \? maximumPeriodsPerDay : undefined\}/);
  assert.match(controls, /این گزینه محدودیت قطعی نیست/);
  assert.match(controls, /بدون محدودیت/);
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
  assert.match(route, /<InfeasibleDiagnostics/);
  assert.match(route, /diagnostics=\{conflictReport\.diagnostics\}/);
});

test("infeasible diagnostics remain in-page, responsive, actionable, and retryable", async () => {
  const [route, panel, queries, api] = await Promise.all([
    readSource("../src/routes/dashboard.generator.tsx"),
    readSource("../src/components/generator/infeasible-diagnostics.tsx"),
    readSource("../src/lib/generator-queries.ts"),
    readSource("../src/lib/api/schedule-api.ts"),
  ]);
  assert.match(api, /parseScheduleDiagnostics\(result\.status, result\.message, result\.details\)/);
  assert.match(route, /result\.status === "INFEASIBLE"/);
  assert.match(route, /saveConflictReport\(result\.diagnostics\)/);
  assert.doesNotMatch(route, /setMinimizeGaps\(/);
  assert.doesNotMatch(route, /setMaxSameCourseSlotsPerDay\(/);
  assert.match(panel, /گزارش تداخل‌های برنامه/);
  assert.match(panel, /lg:grid-cols-2/);
  assert.match(panel, /min-w-0/);
  assert.match(panel, /flex-wrap/);
  assert.match(panel, /to="\/dashboard\/teachers"/);
  assert.match(panel, /to="\/dashboard\/classes"/);
  assert.match(panel, /onClick=\{onRetry\}/);
  assert.match(panel, /aria-live="polite"/);
  assert.match(panel, /نیاز به بررسی/);
  assert.match(panel, /برطرف شد/);
  assert.match(panel, /تولید مجدد برنامه/);
  assert.match(panel, /به معنی امکان‌پذیر بودن قطعی کل برنامه نیست/);
  assert.match(panel, /aria-label="بستن گزارش تداخل‌ها"/);
  assert.doesNotMatch(panel, /error\.message|diagnostic\.message|JSON\.stringify/);
  assert.doesNotMatch(panel, /useQuery|fetch\(|scheduleApi|repositories/);
  assert.equal(queries.match(/useScheduleAssignmentReferences\(classIds\)/g)?.length, 1);
});

test("Repair CTA is scoped to infeasibility and uses one guarded React Query mutation", async () => {
  const [route, panel, queries, api] = await Promise.all([
    readSource("../src/routes/dashboard.generator.tsx"),
    readSource("../src/components/generator/infeasible-diagnostics.tsx"),
    readSource("../src/lib/generator-queries.ts"),
    readSource("../src/lib/api/schedule-api.ts"),
  ]);
  assert.match(route, /conflictReport \? \(/);
  assert.match(route, /onRepair=\{repairAvailability\}/);
  assert.match(route, /repairInFlight\.current/);
  assert.match(route, /await repair\.mutateAsync\(generationSettings\.settings\)/);
  assert.equal(route.match(/repair\.mutateAsync\(generationSettings\.settings\)/g)?.length, 1);
  assert.doesNotMatch(
    route.match(/const repairAvailability[\s\S]*?\n  };/)?.[0] ?? "",
    /setOutcome|saveConflictReport|setMinimizeGaps|setMaxSameCourseSlotsPerDay/,
  );
  assert.match(panel, /repairPending \? "در حال بررسی…" : "تعمیر برنامه"/);
  assert.match(panel, /disabled=\{pending \|\| repairPending\}/);
  assert.match(queries, /useRepairScheduleAvailability/);
  assert.match(queries, /scheduleApi\.repairAvailability\(schoolId, settings\)/);
  assert.match(api, /\/repair-availability/);
});

test("Generate and Repair expose compact mutually exclusive loading feedback", async () => {
  const [route, progress, readiness, diagnostics] = await Promise.all([
    readSource("../src/routes/dashboard.generator.tsx"),
    readSource("../src/components/generator/generation-progress.tsx"),
    readSource("../src/components/generator/generator-readiness.tsx"),
    readSource("../src/components/generator/infeasible-diagnostics.tsx"),
  ]);

  assert.match(route, /const operationPending = generate\.isPending \|\| repair\.isPending/);
  assert.match(route, /repair\.isPending \|\|\s*repairInFlight\.current/);
  assert.match(route, /generate\.isPending \|\|\s*generationInFlight\.current/);
  assert.match(route, /operation=\{repair\.isPending \? "repair" : "generate"\}/);
  assert.match(route, /operationLocked=\{repair\.isPending\}/);
  assert.match(route, /disabled=\{operationPending\}/);
  assert.match(readiness, /در حال تولید…/);
  assert.match(diagnostics, /در حال بررسی…/);
  assert.match(readiness, /aria-busy=\{pending\}/);
  assert.match(diagnostics, /aria-busy=\{repairPending\}/);
  assert.match(progress, /در حال تولید برنامه…/);
  assert.match(progress, /بررسی محدودیت‌ها و ساخت برنامه ممکن است چند لحظه طول بکشد/);
  assert.match(progress, /در حال بررسی راه‌حل‌های تعمیر برنامه…/);
  assert.match(progress, /بررسی تغییرات لازم ممکن است چند لحظه طول بکشد/);
  assert.match(progress, /aria-live="polite"/);
  assert.match(progress, /motion-reduce:animate-none/);
});

test("Generator loading feedback clears for success, infeasible, and failure paths", async () => {
  const route = await readSource("../src/routes/dashboard.generator.tsx");
  const generationHandler = route.match(/const startGeneration[\s\S]*?\n  };/)?.[0] ?? "";
  const repairHandler = route.match(/const repairAvailability[\s\S]*?\n  };/)?.[0] ?? "";

  assert.match(generationHandler, /result\.status === "INFEASIBLE"/);
  assert.match(generationHandler, /catch \(error\)/);
  assert.match(generationHandler, /finally/);
  assert.match(generationHandler, /generationInFlight\.current = false/);
  assert.match(repairHandler, /catch \(error\)/);
  assert.match(repairHandler, /finally/);
  assert.match(repairHandler, /repairInFlight\.current = false/);
  assert.match(route, /\{operationPending \? \(/);
});

test("repair remains a responsive non-persistent proposal and reuses the School preview", async () => {
  const [resultPanel, preview, route] = await Promise.all([
    readSource("../src/components/generator/availability-repair-result.tsx"),
    readSource("../src/components/generator/timetable-preview.tsx"),
    readSource("../src/routes/dashboard.generator.tsx"),
  ]);
  assert.match(resultPanel, /پیشنهاد تعمیر آماده است/);
  assert.match(resultPanel, /هنوز ذخیره نشده و برنامه نهایی را تغییر نمی‌دهد/);
  assert.match(resultPanel, /<TimetablePreview/);
  assert.match(resultPanel, /normalizeCandidateTimetable/);
  assert.match(resultPanel, /timetable=\{timetable\}/);
  assert.match(resultPanel, /sm:grid-cols-2 xl:grid-cols-3/);
  assert.match(resultPanel, /flex flex-col gap-3.*sm:flex-row/);
  assert.match(resultPanel, /to="\/dashboard\/teachers"/);
  assert.doesNotMatch(resultPanel, /AlertDialog|confirmCandidate|queryClient|error\.message/);
  assert.match(preview, /timetable: NormalizedTimetable/);
  assert.match(route, /conflictReport && repairResult \? \(/);
  assert.match(route, /<AvailabilityRepairResult/);
  assert.doesNotMatch(
    route.match(/const repairAvailability[\s\S]*?\n  };/)?.[0] ?? "",
    /toast\.success|setGeneratedScheduleId|confirmGeneratedSchedule/,
  );
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
