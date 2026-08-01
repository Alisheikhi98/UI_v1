import type { ClassAssignment, TeacherWithAvailability } from "@/lib/types";

export type { ClassAssignment } from "@/lib/types";

export const MAX_WEEKLY_PERIODS = 8;

export function isAssignmentComplete(
  assignment: ClassAssignment,
  teachers: TeacherWithAvailability[],
): boolean {
  const teacher = teachers.find((item) => item.id === assignment.teacherId);
  return Boolean(
    teacher &&
    assignment.weeklyPeriods >= 1 &&
    assignment.weeklyPeriods <= MAX_WEEKLY_PERIODS &&
    teacher.availableDaySlotIds.length,
  );
}
