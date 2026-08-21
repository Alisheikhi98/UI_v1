import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import {
  filterTimetableClasses,
  getTeacherEntries,
  normalizePublishedTimetable,
} from "../src/lib/timetable.ts";
import {
  calculateTimetableFitScale,
  getNextTimetableZoom,
  MAX_TIMETABLE_SCALE,
  MIN_TIMETABLE_SCALE,
} from "../src/lib/timetable-viewport.ts";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

const classes = [
  { id: "10", name: "دهم ریاضی", gradeId: "10", majorId: "2", studentCapacity: 0 },
  { id: "11", name: "یازدهم تجربی", gradeId: "11", majorId: "3", studentCapacity: 0 },
];
const teachers = [
  { id: "20", name: "علی احمدی", email: "", phone: "", courseIds: [], status: "active" },
];
const majors = [
  { id: "2", code: "math", name: "Mathematics", active: true },
  { id: "3", code: "exp", name: "Experimental", active: true },
];
const daySlotGroups = [
  {
    dayId: 1,
    dayName: "Saturday",
    slots: [
      {
        id: "30",
        schoolId: "1",
        dayId: 1,
        slotNumber: 1,
        title: null,
        startTime: "08:00:00",
        endTime: "08:45:00",
        active: true,
      },
    ],
  },
];
const schedules = [
  {
    classId: "10",
    className: "دهم ریاضی",
    items: [
      {
        id: "90",
        daySlotId: "30",
        dayId: "1",
        dayName: "Saturday",
        slotNumber: 1,
        startTime: "08:00:00",
        endTime: "08:45:00",
        courseId: "40",
        courseName: "فیزیک",
        teacherId: "20",
        teacherName: "علی احمدی",
      },
    ],
  },
  { classId: "11", className: "یازدهم تجربی", items: [] },
];
const timetable = normalizePublishedTimetable({
  schoolId: "1",
  schoolName: "مدرسه نمونه",
  classes,
  teachers,
  majors,
  daySlotGroups,
  classSchedules: schedules,
});

describe("Weekly Timetable normalized backend model", () => {
  test("uses backend IDs and one normalized entry collection for every view", () => {
    expect(timetable.classes).toHaveLength(2);
    expect(timetable.days[0].id).toBe("1");
    expect(timetable.periods[0].id).toBe("slot-1");
    expect(timetable.entries[0]).toMatchObject({
      id: "90",
      classId: "10",
      teacherId: "20",
      courseId: "40",
      courseName: "فیزیک",
    });
    expect(getTeacherEntries(timetable, "20")).toEqual(timetable.entries);
  });

  test("filters the school master view by grade, major, and class search together", () => {
    const target = timetable.classes[0];
    const result = filterTimetableClasses(timetable.classes, {
      gradeId: target.gradeId,
      majorId: target.majorId,
      search: target.shortName,
    });

    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((item) => item.gradeId === target.gradeId && item.majorId === target.majorId),
    ).toBe(true);
  });

  test("an empty authoritative response produces the no-final state", () => {
    const empty = normalizePublishedTimetable({
      schoolId: "1",
      schoolName: "مدرسه نمونه",
      classes,
      teachers,
      majors,
      daySlotGroups,
      classSchedules: schedules.map((schedule) => ({ ...schedule, items: [] })),
    });
    expect(empty.entries).toHaveLength(0);
  });
});

describe("Weekly Timetable UI", () => {
  test("defaults to the School view and exposes School, Class, and Teacher modes", async () => {
    const [routeSource, toolbarSource] = await Promise.all([
      readSource("../src/routes/dashboard.timetable.tsx"),
      readSource("../src/components/timetable/weekly-timetable-toolbar.tsx"),
    ]);

    expect(routeSource).toContain('useState<TimetableViewMode>("school")');
    expect(routeSource).toContain("usePublishedTimetable()");
    expect(routeSource).not.toContain("demoFinalTimetable");
    expect(routeSource).toContain("<SchoolMasterTimetable");
    expect(routeSource).toContain("<EntityTimetable");
    expect(toolbarSource).toContain('value="school"');
    expect(toolbarSource).toContain('value="class"');
    expect(toolbarSource).toContain('value="teacher"');
    expect(toolbarSource).toContain('aria-label="نوع نمایش برنامه هفتگی"');
  });

  test("school master table is data-driven, grouped by day, scrollable, and sticky", async () => {
    const source = await readSource("../src/components/timetable/school-master-timetable.tsx");

    expect(source).toContain("timetable.days.map");
    expect(source).toContain("timetable.periods.map");
    expect(source).toContain("classes.map");
    expect(source).toContain("rowSpan={timetable.periods.length}");
    expect(source).toContain("overflow-auto");
    expect(source).toContain("sticky top-0");
    expect(source).toContain("sticky right-0");
    expect(source).toContain("right-[4.5rem]");
    expect(source).toContain('period.slotNumber.toLocaleString("fa-IR")');
    expect(source).toContain("w-[4.5rem] min-w-[4.5rem]");
    expect(source).toContain("w-[3.25rem] min-w-[3.25rem]");
  });

  test("each occupied cell displays the course and its contextual teacher or class", async () => {
    const source = await readSource("../src/components/timetable/timetable-cell.tsx");
    expect(source).toContain("entry.courseName");
    expect(source).toContain("secondaryText");
    expect(source).toContain('aria-label="زنگ خالی"');
  });

  test("toolbar keeps contextual School, Class, and Teacher controls in one responsive group", async () => {
    const source = await readSource("../src/components/timetable/weekly-timetable-toolbar.tsx");
    expect(source).toContain("timetable-toolbar-primary");
    expect(source).toContain("timetable-context-controls");
    expect(source).toContain('htmlFor="timetable-grade-filter"');
    expect(source).toContain('htmlFor="timetable-major-filter"');
    expect(source).toContain('htmlFor="timetable-class-select"');
    expect(source).toContain('htmlFor="timetable-teacher-select"');
    expect(source.match(/<SelectItem value="all">همه<\/SelectItem>/g)).toHaveLength(2);
    expect(source).not.toContain("همه پایه‌ها");
    expect(source).not.toContain("همه رشته‌ها");
    expect(source).toContain("پاک کردن فیلترها");
    expect(source).toContain("filtersActive &&");
  });

  test("School summary and contextual view headings derive only from normalized timetable data", async () => {
    const [routeSource, summarySource, headingSource] = await Promise.all([
      readSource("../src/routes/dashboard.timetable.tsx"),
      readSource("../src/components/timetable/timetable-summary.tsx"),
      readSource("../src/components/timetable/timetable-view-header.tsx"),
    ]);
    expect(routeSource).toContain("<TimetableSummary");
    expect(routeSource).toContain("<TimetableViewHeader");
    expect(summarySource).toContain("timetable.entries");
    expect(summarySource).toContain("timetable.days.length");
    expect(summarySource).toContain("timetable.periods.length");
    expect(summarySource).toContain("جلسه برنامه‌ریزی‌شده");
    expect(headingSource).toContain("برنامه جامع مدرسه");
    expect(headingSource).toContain("برنامه کلاس");
    expect(headingSource).toContain("برنامه هفتگی");
  });

  test("master timetable visually groups days and highlights rows and Class columns without changing data", async () => {
    const [source, styles] = await Promise.all([
      readSource("../src/components/timetable/school-master-timetable.tsx"),
      readSource("../src/styles.css"),
    ]);
    expect(source).toContain("data-day-start={periodIndex === 0}");
    expect(source).toContain("highlightedClassId");
    expect(source).toContain("data-class-column");
    expect(styles).toContain('.school-master-table tbody tr[data-day-start="true"]');
    expect(styles).toContain("@media (hover: hover) and (pointer: fine)");
  });

  test("print, fullscreen, and real timetable download actions are wired", async () => {
    const [routeSource, fullscreenSource, toolbarSource, stylesSource] = await Promise.all([
      readSource("../src/routes/dashboard.timetable.tsx"),
      readSource("../src/components/timetable/fullscreen-timetable-overview.tsx"),
      readSource("../src/components/timetable/weekly-timetable-toolbar.tsx"),
      readSource("../src/styles.css"),
    ]);

    expect(routeSource).toContain("onPrint={() => window.print()}");
    expect(routeSource).toContain("<FullscreenTimetableOverview");
    expect(routeSource).toContain("aria-hidden={fullscreen || undefined}");
    expect(fullscreenSource).toContain("fixed inset-0 z-[100]");
    expect(fullscreenSource).toContain('useState<ZoomMode>("fit")');
    expect(fullscreenSource).toContain('event.key === "Escape"');
    expect(fullscreenSource).toContain('document.body.style.overflow = "hidden"');
    expect(fullscreenSource).toContain("previousFocusRef.current?.focus()");
    expect(fullscreenSource).toContain("new ResizeObserver");
    expect(fullscreenSource).toContain("orientationchange");
    expect(fullscreenSource).toContain("classes={timetable.classes}");
    expect(fullscreenSource).toContain("<SchoolMasterTimetable");
    expect(toolbarSource).toContain('onExport("pdf")');
    expect(toolbarSource).toContain('onExport("excel")');
    expect(toolbarSource).toContain("دانلود PDF");
    expect(toolbarSource).toContain("دانلود Excel");
    expect(toolbarSource).not.toContain("به‌زودی");
    expect(routeSource).toContain("createTimetableExportModel");
    expect(routeSource).toContain("downloadWeeklyPlanExcel");
    expect(routeSource).toContain("printTimetablePdf");
    expect(routeSource).not.toContain("toast.success");
    expect(stylesSource).toContain("@media print");
    expect(stylesSource).toContain("#timetable-print-root");
    expect(stylesSource).toContain(".print-hidden");
    expect(stylesSource).toContain("html.timetable-fullscreen-active");
    expect(stylesSource).toContain("#timetable-fullscreen-print-root");
  });

  test("Fit preserves proportions, respects the readability floor, and reports overflow honestly", () => {
    expect(
      calculateTimetableFitScale({
        availableWidth: 800,
        availableHeight: 600,
        timetableWidth: 1000,
        timetableHeight: 500,
      }),
    ).toEqual({ scale: 0.8, fitsAtReadableScale: true });

    expect(
      calculateTimetableFitScale({
        availableWidth: 300,
        availableHeight: 200,
        timetableWidth: 1200,
        timetableHeight: 800,
      }),
    ).toEqual({ scale: MIN_TIMETABLE_SCALE, fitsAtReadableScale: false });
  });

  test("manual zoom uses bounded, predictable steps and can return to Fit", async () => {
    const source = await readSource(
      "../src/components/timetable/fullscreen-timetable-overview.tsx",
    );
    expect(getNextTimetableZoom(0.8, "in")).toBe(0.9);
    expect(getNextTimetableZoom(0.8, "out")).toBe(0.7);
    expect(getNextTimetableZoom(MAX_TIMETABLE_SCALE, "in")).toBe(MAX_TIMETABLE_SCALE);
    expect(getNextTimetableZoom(MIN_TIMETABLE_SCALE, "out")).toBe(MIN_TIMETABLE_SCALE);
    expect(source).toContain('setZoomMode("manual")');
    expect(source).toContain('onClick={() => setZoomMode("fit")}');
    expect(source).toContain("disabled={activeScale <= MIN_TIMETABLE_SCALE + 0.001}");
    expect(source).toContain("disabled={activeScale >= MAX_TIMETABLE_SCALE - 0.001}");
  });

  test("fullscreen stays a dedicated School overview while normal page state remains mounted", async () => {
    const [routeSource, fullscreenSource] = await Promise.all([
      readSource("../src/routes/dashboard.timetable.tsx"),
      readSource("../src/components/timetable/fullscreen-timetable-overview.tsx"),
    ]);
    expect(routeSource).toContain("mode={mode}");
    expect(routeSource).toContain("filters={filters}");
    expect(routeSource).toContain("selectedClassId={selectedClassId}");
    expect(routeSource).toContain("selectedTeacherId={selectedTeacherId}");
    expect(routeSource).not.toContain('fullscreen && "fixed inset-0');
    expect(fullscreenSource).not.toContain("WeeklyTimetableToolbar");
    expect(fullscreenSource).not.toContain("TimetableSummary");
    expect(fullscreenSource).not.toContain("filters");
    expect(fullscreenSource).toContain("createPortal");
    expect(fullscreenSource).toContain("جا دادن در صفحه");
    expect(fullscreenSource).toContain("برای مشاهده بهتر برنامه، گوشی را افقی کنید.");
  });

  test("empty states cover missing final schedule and empty selections", async () => {
    const source = await readSource("../src/components/timetable/timetable-empty-state.tsx");
    expect(source).toContain('"no-final"');
    expect(source).toContain('"no-class"');
    expect(source).toContain('"no-teacher"');
    expect(source).toContain('"no-lessons"');
    expect(source).toContain('"load-error"');
    expect(source).toContain('to="/dashboard/generator"');
  });

  test("published queries are school-scoped and fetch each class schedule without mock fallback", async () => {
    const [queries, keys, api] = await Promise.all([
      readSource("../src/lib/timetable-queries.ts"),
      readSource("../src/lib/repository-query-keys.ts"),
      readSource("../src/lib/api/schedule-api.ts"),
    ]);
    expect(keys).toContain('"final-timetable"');
    expect(queries).toContain("repositoryQueryKeys.finalTimetable(schoolId, classIds)");
    expect(queries).toContain("fetchPublishedClassSchedules");
    expect(queries).toContain("!useMockApi");
    expect(api).toContain('/classes/${toApiId(classId, "classId")}/schedule');
  });
});
