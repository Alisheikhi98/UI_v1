import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import {
  filterTimetableClasses,
  getTeacherEntries,
  normalizePublishedTimetable,
} from "../src/lib/timetable.ts";

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
    expect(toolbarSource).toContain('<TabsTrigger value="school">مدرسه</TabsTrigger>');
    expect(toolbarSource).toContain('<TabsTrigger value="class">کلاس</TabsTrigger>');
    expect(toolbarSource).toContain('<TabsTrigger value="teacher">معلم</TabsTrigger>');
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
    expect(source).toContain("right-24");
  });

  test("each occupied cell displays the course and its contextual teacher or class", async () => {
    const source = await readSource("../src/components/timetable/timetable-cell.tsx");
    expect(source).toContain("entry.courseName");
    expect(source).toContain("secondaryText");
  });

  test("print, fullscreen, and honest pending download actions are wired", async () => {
    const [routeSource, toolbarSource, stylesSource] = await Promise.all([
      readSource("../src/routes/dashboard.timetable.tsx"),
      readSource("../src/components/timetable/weekly-timetable-toolbar.tsx"),
      readSource("../src/styles.css"),
    ]);

    expect(routeSource).toContain("onPrint={() => window.print()}");
    expect(routeSource).toContain('fullscreen && "fixed inset-0 z-50');
    expect(toolbarSource).toContain('onExport("pdf")');
    expect(toolbarSource).toContain('onExport("excel")');
    expect(toolbarSource).toContain("به‌زودی");
    expect(routeSource).not.toContain("toast.success");
    expect(stylesSource).toContain("@media print");
    expect(stylesSource).toContain("#timetable-print-root");
    expect(stylesSource).toContain(".print-hidden");
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
