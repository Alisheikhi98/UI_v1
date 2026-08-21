import type { Class, ClassAssignment, Course, DaySlotGroup, Teacher } from "@/lib/types";
import type { ScheduleDiagnostic } from "@/lib/scheduler";
import { getWeekdayDisplayLabel } from "@/lib/weekday-labels";

type BackendDiagnosticDetails = {
  diagnostic?: {
    selected_relaxations?: {
      unmet_assignment_slots?: unknown;
      teacher_conflict_slots?: unknown;
      class_conflict_slots?: unknown;
      daily_course_limit_slots?: unknown;
    };
  };
};

const positiveNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

const parseLessonPairs = <Key extends "classId" | "teacherId">(
  value: string,
  pattern: RegExp,
  secondKey: Key,
) => {
  const lessons: Array<{ courseId: string } & Record<Key, string>> = [];
  for (const match of value.matchAll(pattern)) {
    if (!match[1] || !match[2]) continue;
    lessons.push({ courseId: match[1], [secondKey]: match[2] } as {
      courseId: string;
    } & Record<Key, string>);
  }
  return lessons;
};

export function parseScheduleDiagnostics(
  status: string,
  message: string,
  details: Record<string, unknown>,
): ScheduleDiagnostic[] {
  if (status !== "INFEASIBLE") return [];

  const diagnostics: ScheduleDiagnostic[] = [];
  const lines = message.split(/\r?\n/).map((line) => line.trim());

  for (const line of lines) {
    const shortage = line.match(
      /^Selected relaxation — Assignment shortage: assignment ID (\d+), teacher ID (\d+) teaching course ID (\d+) for class (\d+) requires (\d+) slots but the diagnostic could assign only (\d+); unmet slots: (\d+)\.$/,
    );
    if (shortage) {
      const requiredSlots = positiveNumber(shortage[5]);
      const assignedSlots = positiveNumber(shortage[6]);
      const unmetSlots = positiveNumber(shortage[7]);
      if (requiredSlots !== null && assignedSlots !== null && unmetSlots !== null) {
        diagnostics.push({
          type: "assignment-shortage",
          assignmentId: shortage[1],
          teacherId: shortage[2],
          courseId: shortage[3],
          classId: shortage[4],
          requiredSlots,
          assignedSlots,
          unmetSlots,
        });
      }
      continue;
    }

    const teacherConflict = line.match(
      /^Selected relaxation — Teacher ID (\d+) conflict at Day ([A-Za-z]+) Slot (\d+) between: (.+)$/,
    );
    if (teacherConflict) {
      const slot = positiveNumber(teacherConflict[3]);
      const lessons = parseLessonPairs(
        teacherConflict[4],
        /Course ID (\d+) \(Class (\d+)\)/g,
        "classId",
      );
      if (slot !== null && slot > 0) {
        diagnostics.push({
          type: "teacher-conflict",
          teacherId: teacherConflict[1],
          day: teacherConflict[2],
          slot,
          lessons,
        });
      }
      continue;
    }

    const classConflict = line.match(
      /^Selected relaxation — Class (\d+) conflict at Day ([A-Za-z]+) Slot (\d+) between: (.+)$/,
    );
    if (classConflict) {
      const slot = positiveNumber(classConflict[3]);
      const lessons = parseLessonPairs(
        classConflict[4],
        /Course ID (\d+) \(Teacher ID (\d+)\)/g,
        "teacherId",
      );
      if (slot !== null && slot > 0) {
        diagnostics.push({
          type: "class-conflict",
          classId: classConflict[1],
          day: classConflict[2],
          slot,
          lessons,
        });
      }
      continue;
    }

    const dailyLimit = line.match(
      /^Selected relaxation — Daily course limit conflict: Class (\d+), Course ID (\d+), Day ([A-Za-z]+) needs (\d+) slot\(s\) above the configured limit of (\d+)\.$/,
    );
    if (dailyLimit) {
      const excessSlots = positiveNumber(dailyLimit[4]);
      const configuredLimit = positiveNumber(dailyLimit[5]);
      if (excessSlots !== null && configuredLimit !== null) {
        diagnostics.push({
          type: "daily-course-limit",
          classId: dailyLimit[1],
          courseId: dailyLimit[2],
          day: dailyLimit[3],
          excessSlots,
          configuredLimit,
        });
      }
    }
  }

  if (diagnostics.length > 0) return diagnostics;

  const selected = (details as BackendDiagnosticDetails).diagnostic?.selected_relaxations;
  const aggregateFields = [
    ["assignment-shortage", selected?.unmet_assignment_slots],
    ["teacher-conflict", selected?.teacher_conflict_slots],
    ["class-conflict", selected?.class_conflict_slots],
    ["daily-course-limit", selected?.daily_course_limit_slots],
  ] as const;
  const aggregates = aggregateFields.flatMap(([conflictType, value]) =>
    typeof value === "number" && Number.isSafeInteger(value) && value > 0
      ? [{ type: "aggregate", conflictType, count: value } as const]
      : [],
  );

  return aggregates.length > 0 ? aggregates : [{ type: "unknown" }];
}

export interface ScheduleDiagnosticPresentation {
  id: string;
  title: string;
  classes: string[];
  teachers: string[];
  courses: string[];
  timeLabel: string | null;
  reason: string;
  suggestion: string;
  resolved: boolean;
  teacherAction: boolean;
  classAction: boolean;
}

const resolveDay = (day: string) => {
  const localized = getWeekdayDisplayLabel(day);
  return localized === day ? "روز مشخص‌شده" : localized;
};

const faNumber = (value: number) => value.toLocaleString("fa-IR");

function diagnosticIsResolved(
  diagnostic: ScheduleDiagnostic,
  assignments: readonly ClassAssignment[],
) {
  if (diagnostic.type === "assignment-shortage") {
    const assignment = assignments.find((item) => item.id === diagnostic.assignmentId);
    if (!assignment) return true;
    if (
      assignment.classId !== diagnostic.classId ||
      assignment.courseId !== diagnostic.courseId ||
      assignment.teacherId !== diagnostic.teacherId
    ) {
      return true;
    }
    return assignment.weeklyPeriods <= diagnostic.assignedSlots;
  }

  if (diagnostic.type === "teacher-conflict") {
    if (diagnostic.lessons.length < 2) return false;
    const activeRelationships = diagnostic.lessons.filter((lesson) =>
      assignments.some(
        (assignment) =>
          assignment.classId === lesson.classId &&
          assignment.courseId === lesson.courseId &&
          assignment.teacherId === diagnostic.teacherId,
      ),
    );
    return activeRelationships.length < 2;
  }

  if (diagnostic.type === "class-conflict") {
    if (diagnostic.lessons.length < 2) return false;
    const activeRelationships = diagnostic.lessons.filter((lesson) =>
      assignments.some(
        (assignment) =>
          assignment.classId === diagnostic.classId &&
          assignment.courseId === lesson.courseId &&
          assignment.teacherId === lesson.teacherId,
      ),
    );
    return activeRelationships.length < 2;
  }

  if (diagnostic.type === "daily-course-limit") {
    const assignment = assignments.find(
      (item) => item.classId === diagnostic.classId && item.courseId === diagnostic.courseId,
    );
    return !assignment || assignment.weeklyPeriods <= diagnostic.configuredLimit;
  }

  return false;
}

export function presentScheduleDiagnostics(
  diagnostics: readonly ScheduleDiagnostic[],
  referenceData: {
    teachers: readonly Teacher[];
    classes: readonly Class[];
    courses: ReadonlyArray<Pick<Course, "id" | "name">>;
    daySlotGroups: readonly DaySlotGroup[];
    assignments: readonly ClassAssignment[];
  },
): ScheduleDiagnosticPresentation[] {
  const teachers = new Map(referenceData.teachers.map((item) => [item.id, item.name]));
  const classes = new Map(referenceData.classes.map((item) => [item.id, item.name]));
  const courses = new Map(referenceData.courses.map((item) => [item.id, item.name]));
  const knownDays = new Set(
    referenceData.daySlotGroups.map((group) => group.dayName.toLowerCase()),
  );
  const teacherName = (id: string) => teachers.get(id) ?? "معلم مربوط";
  const className = (id: string) => classes.get(id) ?? "کلاس مربوط";
  const courseName = (id: string) => courses.get(id) ?? "درس مربوط";
  const timeLabel = (day: string, slot: number) => {
    const dayLabel = knownDays.has(day.toLowerCase()) ? resolveDay(day) : "روز مشخص‌شده";
    return `${dayLabel} — زنگ ${faNumber(slot)}`;
  };

  return diagnostics.map((diagnostic, index) => {
    const id = `${diagnostic.type}-${index}`;
    const resolved = diagnosticIsResolved(diagnostic, referenceData.assignments);
    if (diagnostic.type === "assignment-shortage") {
      return {
        id,
        title: "کمبود ظرفیت زمانی",
        classes: [className(diagnostic.classId)],
        teachers: [teacherName(diagnostic.teacherId)],
        courses: [courseName(diagnostic.courseId)],
        timeLabel: null,
        reason: `این درس به ${faNumber(diagnostic.requiredSlots)} زنگ نیاز دارد، اما فقط ${faNumber(diagnostic.assignedSlots)} زنگ قابل قرارگیری است؛ ${faNumber(diagnostic.unmetSlots)} زنگ کمبود وجود دارد.`,
        suggestion: "تعداد زنگ هفتگی، روزهای حضور معلم و زنگ‌های مدرسه را بررسی کنید.",
        resolved,
        teacherAction: teachers.has(diagnostic.teacherId),
        classAction: classes.has(diagnostic.classId),
      };
    }

    if (diagnostic.type === "teacher-conflict") {
      const affectedClasses = diagnostic.lessons.map((item) => className(item.classId));
      const affectedCourses = diagnostic.lessons.map((item) => courseName(item.courseId));
      return {
        id,
        title: "تداخل زمانی معلم",
        classes: affectedClasses,
        teachers: [teacherName(diagnostic.teacherId)],
        courses: affectedCourses,
        timeLabel: timeLabel(diagnostic.day, diagnostic.slot),
        reason: "این معلم در یک زنگ برای چند کلاس در نظر گرفته شده است.",
        suggestion: "دسترسی زمانی معلم یا تخصیص یکی از کلاس‌ها را بررسی کنید.",
        resolved,
        teacherAction: teachers.has(diagnostic.teacherId),
        classAction: diagnostic.lessons.some((item) => classes.has(item.classId)),
      };
    }

    if (diagnostic.type === "class-conflict") {
      const affectedTeachers = diagnostic.lessons.map((item) => teacherName(item.teacherId));
      const affectedCourses = diagnostic.lessons.map((item) => courseName(item.courseId));
      return {
        id,
        title: "تداخل هم‌زمان درس‌های کلاس",
        classes: [className(diagnostic.classId)],
        teachers: affectedTeachers,
        courses: affectedCourses,
        timeLabel: timeLabel(diagnostic.day, diagnostic.slot),
        reason: "برای این کلاس، چند درس در یک زنگ مشترک در نظر گرفته شده‌اند.",
        suggestion: "تخصیص درس‌ها، معلمان و تعداد زنگ‌های این کلاس را بررسی کنید.",
        resolved,
        teacherAction: diagnostic.lessons.some((item) => teachers.has(item.teacherId)),
        classAction: classes.has(diagnostic.classId),
      };
    }

    if (diagnostic.type === "daily-course-limit") {
      return {
        id,
        title: "محدودیت تکرار روزانه درس",
        classes: [className(diagnostic.classId)],
        teachers: [],
        courses: [courseName(diagnostic.courseId)],
        timeLabel: resolveDay(diagnostic.day),
        reason: `برای این درس ${faNumber(diagnostic.excessSlots)} زنگ بیشتر از سقف روزانه ${faNumber(diagnostic.configuredLimit)} زنگ نیاز است.`,
        suggestion: "سقف تکرار روزانه یا تعداد زنگ هفتگی این درس را بررسی کنید.",
        resolved,
        teacherAction: false,
        classAction: classes.has(diagnostic.classId),
      };
    }

    if (diagnostic.type === "aggregate") {
      const labels = {
        "assignment-shortage": "کمبود ظرفیت زمانی",
        "teacher-conflict": "تداخل زمانی معلم",
        "class-conflict": "تداخل هم‌زمان کلاس",
        "daily-course-limit": "محدودیت تکرار روزانه درس",
      };
      return {
        id,
        title: labels[diagnostic.conflictType],
        classes: [],
        teachers: [],
        courses: [],
        timeLabel: null,
        reason: `${faNumber(diagnostic.count)} مورد تداخل شناسایی شده است؛ جزئیات دقیق این موارد از سرور دریافت نشد.`,
        suggestion:
          "اطلاعات کلاس‌ها، معلمان و تعداد زنگ‌ها را بررسی و برنامه را دوباره تولید کنید.",
        resolved,
        teacherAction: false,
        classAction: false,
      };
    }

    return {
      id,
      title: "تداخل زمان‌بندی",
      classes: [],
      teachers: [],
      courses: [],
      timeLabel: null,
      reason: "جزئیات دقیق تداخل از سرور دریافت نشد. اطلاعات کلاس‌ها و معلمان را بررسی کنید.",
      suggestion: "پس از بررسی اطلاعات، برنامه را دوباره تولید کنید.",
      resolved,
      teacherAction: false,
      classAction: false,
    };
  });
}
