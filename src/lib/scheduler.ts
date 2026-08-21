import type { Class, ClassAssignment, DaySlotGroup, Teacher } from "@/lib/types";

export interface ScheduledLesson {
  assignmentId: string;
  daySlotId: string;
  teacherId: string;
  classId: string;
  courseId: string;
  day: string;
  slot: number;
}

export interface ScheduleGenerationResult {
  success: boolean;
  status: string;
  code: string;
  candidateId: string | null;
  totalGap: number;
  lessons: ScheduledLesson[];
  diagnostics: ScheduleDiagnostic[];
}

export interface ScheduleAvailabilityAddition {
  teacherId: string;
  daySlotId: string;
  day: string;
  slot: number;
}

export interface ScheduleRepairResult {
  success: boolean;
  status: string;
  code: string;
  totalGap: number;
  lessons: ScheduledLesson[];
  repairType: "teacher_availability_additions" | null;
  minimumChanges: number | null;
  minimumChangesProven: boolean | null;
  proposedAvailabilityAdditions: ScheduleAvailabilityAddition[];
}

export type ScheduleDiagnostic =
  | {
      type: "assignment-shortage";
      assignmentId: string;
      teacherId: string;
      courseId: string;
      classId: string;
      requiredSlots: number;
      assignedSlots: number;
      unmetSlots: number;
    }
  | {
      type: "teacher-conflict";
      teacherId: string;
      day: string;
      slot: number;
      lessons: Array<{ courseId: string; classId: string }>;
    }
  | {
      type: "class-conflict";
      classId: string;
      day: string;
      slot: number;
      lessons: Array<{ courseId: string; teacherId: string }>;
    }
  | {
      type: "daily-course-limit";
      classId: string;
      courseId: string;
      day: string;
      excessSlots: number;
      configuredLimit: number;
    }
  | {
      type: "aggregate";
      conflictType:
        | "assignment-shortage"
        | "teacher-conflict"
        | "class-conflict"
        | "daily-course-limit";
      count: number;
    }
  | { type: "unknown" };

export interface ScheduleGenerationSettings {
  minimizeGaps: boolean;
  maxSameCourseSlotsPerDay: number | null;
}

export const DEFAULT_SCHEDULE_GENERATION_SETTINGS: ScheduleGenerationSettings = {
  minimizeGaps: true,
  maxSameCourseSlotsPerDay: null,
};

export function getMaximumPeriodsPerDay(daySlotGroups: readonly DaySlotGroup[]) {
  return daySlotGroups.reduce(
    (maximum, group) => Math.max(maximum, group.slots.filter((slot) => slot.active).length),
    0,
  );
}

export function parseScheduleGenerationSettings({
  minimizeGaps,
  maxSameCourseSlotsPerDay,
  maximumPeriodsPerDay,
}: {
  minimizeGaps: boolean;
  maxSameCourseSlotsPerDay: string;
  maximumPeriodsPerDay: number;
}): { settings: ScheduleGenerationSettings | null; error: string | null } {
  const value = maxSameCourseSlotsPerDay.trim();

  if (value === "") {
    return {
      settings: { minimizeGaps, maxSameCourseSlotsPerDay: null },
      error: null,
    };
  }

  if (!/^\d+$/.test(value)) {
    return { settings: null, error: "تعداد تکرار باید یک عدد صحیح مثبت باشد." };
  }

  const numericValue = Number(value);
  if (!Number.isSafeInteger(numericValue) || numericValue < 1) {
    return { settings: null, error: "حداقل تعداد تکرار در روز ۱ است." };
  }

  if (maximumPeriodsPerDay < 1) {
    return {
      settings: null,
      error: "برای تعیین این محدودیت، ابتدا زنگ‌های مدرسه را ثبت کنید.",
    };
  }

  if (numericValue > maximumPeriodsPerDay) {
    return {
      settings: null,
      error: `حداکثر مقدار مجاز با توجه به زنگ‌های مدرسه ${maximumPeriodsPerDay.toLocaleString("fa-IR")} است.`,
    };
  }

  return {
    settings: { minimizeGaps, maxSameCourseSlotsPerDay: numericValue },
    error: null,
  };
}

export interface ScheduleCandidateSummary {
  id: string;
  status: string;
  totalGap: number;
  selected: boolean;
  createdAt: string;
}

export interface ScheduleCandidateDetail extends ScheduleCandidateSummary {
  lessons: ScheduledLesson[];
}

export interface ScheduleConfirmation {
  candidateId: string;
  savedLessons: number;
}

export interface PublishedClassScheduleItem {
  id: string;
  daySlotId: string;
  dayId: string;
  dayName: string;
  slotNumber: number;
  startTime: string | null;
  endTime: string | null;
  courseId: string;
  courseName: string;
  teacherId: string | null;
  teacherName: string | null;
}

export interface PublishedClassSchedule {
  classId: string;
  className: string;
  items: PublishedClassScheduleItem[];
}

export interface GeneratorReadinessItem {
  id: "school-calendar" | "assignments" | "teacher-availability" | "weekly-capacity";
  label: string;
  value: string;
  status: "ready" | "needs-attention";
  issueCount?: number;
}

export interface GeneratorReadinessIssue {
  id: string;
  title: string;
  message: string;
  actionHref: "/dashboard/schools" | "/dashboard/teachers" | "/dashboard/classes";
  actionLabel?: string;
}

export interface GeneratorReadiness {
  items: GeneratorReadinessItem[];
  issues: GeneratorReadinessIssue[];
  ready: boolean;
}

export interface ReadinessInput {
  classes: readonly Class[];
  assignments: readonly ClassAssignment[];
  teachers: readonly Teacher[];
  daySlotGroups: readonly DaySlotGroup[];
  availabilityByTeacher: ReadonlyMap<string, readonly string[]>;
}

const faNumber = (value: number) => value.toLocaleString("fa-IR");

export function deriveGeneratorReadiness({
  classes,
  assignments,
  teachers,
  daySlotGroups,
  availabilityByTeacher,
}: ReadinessInput): GeneratorReadiness {
  const issues: GeneratorReadinessIssue[] = [];
  const activeSlots = daySlotGroups.flatMap((group) => group.slots).filter((slot) => slot.active);
  const teacherNames = new Map(teachers.map((teacher) => [teacher.id, teacher.name]));
  const classNames = new Map(classes.map((item) => [item.id, item.name]));
  const assignedClassIds = new Set(assignments.map((assignment) => assignment.classId));
  const classesWithoutAssignments = classes.filter((item) => !assignedClassIds.has(item.id));
  const teacherWorkload = new Map<string, number>();
  const classWorkload = new Map<string, number>();

  assignments.forEach((assignment) => {
    teacherWorkload.set(
      assignment.teacherId,
      (teacherWorkload.get(assignment.teacherId) ?? 0) + assignment.weeklyPeriods,
    );
    classWorkload.set(
      assignment.classId,
      (classWorkload.get(assignment.classId) ?? 0) + assignment.weeklyPeriods,
    );
  });

  if (activeSlots.length === 0) {
    issues.push({
      id: "school-calendar-empty",
      title: "روزها و زنگ‌های مدرسه",
      message: "هیچ زنگ فعالی برای مدرسه ثبت نشده است.",
      actionHref: "/dashboard/schools",
    });
  }
  if (assignments.length === 0) {
    if (classesWithoutAssignments.length > 0) {
      classesWithoutAssignments.forEach((item) => {
        issues.push({
          id: `assignments-empty-${item.id}`,
          title: item.name,
          message: "درس و معلم ثبت نشده است.",
          actionHref: "/dashboard/classes",
          actionLabel: "تکمیل مدیریت کلاس",
        });
      });
    } else {
      issues.push({
        id: "assignments-empty",
        title: "دروس و معلمان کلاس‌ها",
        message: "هنوز اطلاعات درس و معلم لازم برای تولید برنامه ثبت نشده است.",
        actionHref: "/dashboard/classes",
        actionLabel: "تکمیل مدیریت کلاس",
      });
    }
  }

  for (const [teacherId, required] of teacherWorkload) {
    const available = availabilityByTeacher.get(teacherId)?.length ?? 0;
    if (available < required) {
      const teacherName = teacherNames.get(teacherId) ?? "معلم ثبت‌شده";
      issues.push({
        id: `teacher-capacity-${teacherId}`,
        title: teacherName,
        message: `برای ${faNumber(required)} زنگ هفتگی فقط ${faNumber(available)} زمان حضور ثبت شده است.`,
        actionHref: "/dashboard/teachers",
      });
    }
  }

  for (const [classId, required] of classWorkload) {
    if (activeSlots.length > 0 && required > activeSlots.length) {
      const className = classNames.get(classId) ?? "کلاس ثبت‌شده";
      issues.push({
        id: `class-capacity-${classId}`,
        title: className,
        message: `به ${faNumber(required)} زنگ نیاز دارد، اما ظرفیت هفتگی مدرسه ${faNumber(activeSlots.length)} زنگ است.`,
        actionHref: "/dashboard/classes",
      });
    }
  }

  const availabilityIssues = issues.filter((issue) => issue.id.startsWith("teacher-capacity-"));
  const capacityIssues = issues.filter((issue) => issue.id.startsWith("class-capacity-"));
  const items: GeneratorReadinessItem[] = [
    {
      id: "school-calendar",
      label: "ساختار مدرسه",
      value:
        activeSlots.length > 0
          ? `${faNumber(daySlotGroups.filter((group) => group.slots.some((slot) => slot.active)).length)} روز، ${faNumber(activeSlots.length)} زنگ`
          : "نیاز به تکمیل",
      status: activeSlots.length > 0 ? "ready" : "needs-attention",
      issueCount: activeSlots.length > 0 ? 0 : 1,
    },
    {
      id: "assignments",
      label: "دروس و معلمان کلاس‌ها",
      value:
        assignments.length > 0
          ? "اطلاعات درس‌ها و معلمان برای تولید برنامه آماده است."
          : "هنوز اطلاعات درس و معلم لازم برای تولید برنامه ثبت نشده است.",
      status: assignments.length > 0 ? "ready" : "needs-attention",
      issueCount: assignments.length > 0 ? 0 : Math.max(1, classesWithoutAssignments.length),
    },
    {
      id: "teacher-availability",
      label: "دسترسی زمانی معلمان",
      value:
        availabilityIssues.length === 0
          ? `${faNumber(teacherWorkload.size)} معلم آماده`
          : `${faNumber(availabilityIssues.length)} معلم نیاز به تکمیل`,
      status: availabilityIssues.length === 0 ? "ready" : "needs-attention",
      issueCount: availabilityIssues.length,
    },
    {
      id: "weekly-capacity",
      label: "ظرفیت برنامه هفتگی",
      value:
        capacityIssues.length === 0
          ? "ظرفیت کافی است"
          : `${faNumber(capacityIssues.length)} کلاس ناسازگار`,
      status: capacityIssues.length === 0 ? "ready" : "needs-attention",
      issueCount: capacityIssues.length,
    },
  ];

  return { items, issues, ready: items.every((item) => item.status === "ready") };
}

export function getBlockingIssueCount(items: readonly GeneratorReadinessItem[]) {
  return items.reduce((total, item) => total + (item.issueCount ?? 0), 0);
}

export function scheduleStatusLabel(status: string) {
  const labels: Record<string, string> = {
    OPTIMAL: "بهینه",
    FEASIBLE: "قابل اجرا",
    INFEASIBLE: "بدون برنامه قابل اجرا",
    UNKNOWN: "زمان بررسی پایان یافت",
  };
  return labels[status.toUpperCase()] ?? "وضعیت نامشخص";
}
