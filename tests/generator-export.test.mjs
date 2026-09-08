import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createTimetableExportModel,
  createTimetablePrintHtml,
  getTimetablePdfErrorMessage,
  getTimetableExportFilename,
  printTimetablePdf,
  TimetablePrintError,
} from "../src/lib/timetable-export.ts";
import { normalizeCandidateTimetable } from "../src/lib/timetable.ts";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

const candidate = {
  id: "candidate-42",
  lessons: [
    {
      assignmentId: "11",
      daySlotId: "101",
      teacherId: "20",
      classId: "10",
      courseId: "40",
      day: "Saturday",
      slot: 1,
    },
    {
      assignmentId: "12",
      daySlotId: "102",
      teacherId: "21",
      classId: "11",
      courseId: "41",
      day: "Saturday",
      slot: 2,
    },
  ],
};
const classes = [
  { id: "10", name: "دهم ریاضی", gradeId: "10", majorId: "2", studentCapacity: 30 },
  { id: "11", name: "یازدهم تجربی", gradeId: "11", majorId: "3", studentCapacity: 30 },
];
const teachers = [
  { id: "20", name: "احمد رضایی", phone: "", courseIds: [], status: "active" },
  { id: "21", name: "سارا محمدی", phone: "", courseIds: [], status: "active" },
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
    name: "زیست‌شناسی",
    active: false,
    gradeId: "11",
    majorId: "3",
    category: "specialized",
    code: "biology",
    weeklyHours: 3,
    color: "green",
  },
];
const daySlotGroups = [
  {
    dayId: 1,
    dayName: "Saturday",
    slots: [1, 2].map((slotNumber) => ({
      id: String(100 + slotNumber),
      schoolId: "1",
      dayId: 1,
      slotNumber,
      title: null,
      startTime: slotNumber === 1 ? "08:00:00" : "09:15:00",
      endTime: slotNumber === 1 ? "09:15:00" : "10:30:00",
      active: true,
    })),
  },
];

const assignmentCourseReferences = courses.map((course, index) => ({
  assignmentId: String(11 + index),
  courseId: course.id,
  courseName: course.name,
}));

function normalized(referenceData = assignmentCourseReferences) {
  return normalizeCandidateTimetable({
    candidate,
    schoolName: "دبیرستان نمونه",
    classes,
    teachers,
    assignmentCourseReferences: referenceData,
    daySlotGroups,
  });
}

test("generated preview resolves Courses through authoritative assignment IDs", () => {
  const timetable = normalized();
  assert.equal(timetable.entries[0].courseName, "فیزیک");
  assert.equal(timetable.entries[1].courseName, "زیست‌شناسی");
  assert.equal(
    normalized(assignmentCourseReferences.slice(0, 1)).entries[1].courseName,
    "درس حذف‌شده",
  );
  assert.equal(
    normalized([{ assignmentId: "11", courseId: "999", courseName: "نام نامعتبر" }]).entries[0]
      .courseName,
    "درس حذف‌شده",
  );
});

test("Generator reuses assignment snapshots and does not request an incomplete Course list", async () => {
  const [route, queries, keys, preview] = await Promise.all([
    readSource("../src/routes/dashboard.generator.tsx"),
    readSource("../src/lib/timetable-queries.ts"),
    readSource("../src/lib/repository-query-keys.ts"),
    readSource("../src/components/generator/timetable-preview.tsx"),
  ]);

  assert.match(route, /readiness\.assignmentCourseReferences/);
  assert.doesNotMatch(route, /GeneratedScheduleExportActions|downloadTimetable|printTimetable/);
  assert.match(queries, /useScheduleAssignmentReferences/);
  assert.match(queries, /listScheduleSnapshot/);
  assert.doesNotMatch(queries, /filters: \{ active: false \}/);
  assert.match(keys, /scheduleAssignmentReferences/);
  assert.match(preview, /entry\.courseName/);
  assert.doesNotMatch(preview, /درس ثبت‌شده/);
  assert.doesNotMatch(route, /fetch\(.*course|useQueries.*course/s);
});

test("School, Class, and Teacher PDF exports share one prepared model", () => {
  const timetable = normalized();
  const date = new Date("2026-08-18T08:00:00.000Z");
  const school = createTimetableExportModel({ timetable, mode: "school", generatedAt: date });
  const classView = createTimetableExportModel({
    timetable,
    mode: "class",
    selectedClassId: "10",
    generatedAt: date,
  });
  const teacher = createTimetableExportModel({
    timetable,
    mode: "teacher",
    selectedTeacherId: "21",
    generatedAt: date,
  });

  assert.ok(school && classView && teacher);
  assert.equal(
    getTimetableExportFilename(school, "pdf"),
    "chiideman-school-timetable-2026-08-18.pdf",
  );
  assert.equal(
    getTimetableExportFilename(classView, "pdf"),
    "chiideman-class-timetable-2026-08-18.pdf",
  );
  assert.equal(
    getTimetableExportFilename(teacher, "pdf"),
    "chiideman-teacher-timetable-2026-08-18.pdf",
  );
});

test("exports reject missing selections and PDF is a dedicated RTL print document", () => {
  const timetable = normalized();
  assert.equal(createTimetableExportModel({ timetable, mode: "class" }), null);
  assert.equal(createTimetableExportModel({ timetable, mode: "teacher" }), null);

  for (const model of [
    createTimetableExportModel({ timetable, mode: "school" }),
    createTimetableExportModel({ timetable, mode: "class", selectedClassId: "10" }),
    createTimetableExportModel({ timetable, mode: "teacher", selectedTeacherId: "21" }),
  ]) {
    assert.ok(model);
    const html = createTimetablePrintHtml(model);
    assert.match(html, /<html lang="fa" dir="rtl">/);
    assert.match(html, /@page \{ size: landscape/);
    assert.match(html, /برنامه هفتگی مدرسه/);
    assert.match(html, /دبیرستان نمونه/);
    assert.doesNotMatch(html, /dashboard|sidebar|toolbar|دانلود/);
  }
});

test("School, Class, and Teacher PDF documents use distinct current-view layouts", () => {
  const timetable = normalized();
  const school = createTimetableExportModel({ timetable, mode: "school" });
  const classView = createTimetableExportModel({
    timetable,
    mode: "class",
    selectedClassId: "10",
  });
  const teacher = createTimetableExportModel({
    timetable,
    mode: "teacher",
    selectedTeacherId: "21",
  });
  assert.ok(school && classView && teacher);

  const schoolHtml = createTimetablePrintHtml(school);
  assert.match(schoolHtml, /<table class="school"/);
  assert.match(schoolHtml, /دهم ریاضی/);
  assert.match(schoolHtml, /فیزیک/);
  assert.match(schoolHtml, /احمد رضایی/);
  assert.match(schoolHtml, /rowspan="2"/);

  const classHtml = createTimetablePrintHtml(classView);
  assert.match(classHtml, /<table class="entity"/);
  assert.match(classHtml, /<th scope="col">درس<\/th><th scope="col">معلم<\/th>/);
  assert.match(classHtml, /نمای کلاس — دهم ریاضی/);
  assert.match(classHtml, /فیزیک/);
  assert.match(classHtml, /احمد رضایی/);
  assert.doesNotMatch(classHtml, /زیست‌شناسی/);

  const teacherHtml = createTimetablePrintHtml(teacher);
  assert.match(teacherHtml, /<th scope="col">درس<\/th><th scope="col">کلاس<\/th>/);
  assert.match(teacherHtml, /نمای معلم — سارا محمدی/);
  assert.match(teacherHtml, /زیست‌شناسی/);
  assert.match(teacherHtml, /یازدهم تجربی/);
  assert.doesNotMatch(teacherHtml, /فیزیک/);
});

test("PDF print opens synchronously, waits for layout, and closes after printing", async () => {
  const model = createTimetableExportModel({ timetable: normalized(), mode: "school" });
  assert.ok(model);
  const originalWindow = globalThis.window;
  const events = [];
  let afterPrint;
  const printWindow = {
    closed: false,
    document: {
      open: () => events.push("open"),
      write: (html) => events.push(html.includes("برنامه هفتگی مدرسه") ? "write" : "bad-write"),
      close: () => events.push("document-close"),
      fonts: { ready: Promise.resolve() },
    },
    requestAnimationFrame: (callback) => {
      events.push("frame");
      callback();
    },
    addEventListener: (name, callback) => {
      if (name === "afterprint") afterPrint = callback;
    },
    focus: () => events.push("focus"),
    print: () => events.push("print"),
    close() {
      this.closed = true;
      events.push("window-close");
    },
  };
  globalThis.window = { open: () => printWindow };

  try {
    await printTimetablePdf(model);
    assert.deepEqual(events, [
      "open",
      "write",
      "document-close",
      "frame",
      "frame",
      "focus",
      "print",
    ]);
    assert.equal(printWindow.closed, false);
    afterPrint();
    assert.equal(printWindow.closed, true);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("blocked and failed PDF preparation produce safe localized errors", async () => {
  const model = createTimetableExportModel({ timetable: normalized(), mode: "school" });
  assert.ok(model);
  const originalWindow = globalThis.window;
  globalThis.window = { open: () => null };
  try {
    await assert.rejects(
      printTimetablePdf(model),
      (error) => error instanceof TimetablePrintError && error.code === "POPUP_BLOCKED",
    );
  } finally {
    globalThis.window = originalWindow;
  }

  assert.match(getTimetablePdfErrorMessage(new TimetablePrintError("POPUP_BLOCKED")), /مسدود/);
  assert.equal(
    getTimetablePdfErrorMessage(new Error("raw browser failure")),
    "آماده‌سازی PDF انجام نشد.",
  );
});

test("Weekly Timetable connects server Excel and client PDF without changing print or fullscreen", async () => {
  const [route, actions, exportUtility, excelUtility] = await Promise.all([
    readSource("../src/routes/dashboard.timetable.tsx"),
    readSource("../src/components/timetable/timetable-page-actions.tsx"),
    readSource("../src/lib/timetable-export.ts"),
    readSource("../src/lib/api/timetable-excel.ts"),
  ]);

  assert.match(route, /createTimetableExportModel/);
  assert.match(route, /await downloadWeeklyPlanExcel\(/);
  assert.match(route, /await printTimetablePdf\(exportModel\)/);
  assert.match(route, /exportInFlight\.current/);
  assert.match(route, /const pdfExportDisabled = !schoolId \|\| !exportModel/);
  assert.match(route, /pdfExportDisabled=\{pdfExportDisabled\}/);
  assert.match(route, /excelExportDisabled=\{excelExportDisabled\}/);
  assert.match(actions, /دانلود PDF/);
  assert.match(actions, /دانلود Excel/);
  assert.match(actions, /min-h-10/);
  assert.doesNotMatch(actions, /به‌زودی/);
  assert.doesNotMatch(exportUtility, /write-excel-file|SheetData/);
  assert.match(excelUtility, /weekly-plan\.xlsx/);
  assert.match(excelUtility, /URL\.revokeObjectURL/);
  assert.match(exportUtility, /printWindow\.print\(\)/);
  assert.match(route, /onPrint=\{\(\) => window\.print\(\)\}/);
  assert.match(route, /FullscreenTimetableOverview/);
});
