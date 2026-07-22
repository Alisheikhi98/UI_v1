export type Weekday = "saturday" | "sunday" | "monday" | "tuesday" | "wednesday" | "thursday";

export interface CourseOption {
  id: string;
  name: string;
  grade: string;
  major: string;
  category: string;
  code: string;
  active: boolean;
  gradeId?: string;
  gradeName?: string;
  majorId?: string;
  majorName?: string;
}

export interface TeacherOption {
  id: string;
  name: string;
  code: string;
  phone: string;
  active: boolean;
  availableDays: Weekday[];
}

export interface ClassAssignment {
  id: string;
  classId: string;
  courseId: string;
  teacherId: string;
  slotsPerWeek: number;
}

export const MAX_WEEKLY_PERIODS = 8;

export function isAssignmentComplete(
  assignment: ClassAssignment,
  teachers: TeacherOption[],
): boolean {
  const teacher = teachers.find((item) => item.id === assignment.teacherId);
  return Boolean(
    teacher &&
    assignment.slotsPerWeek >= 1 &&
    assignment.slotsPerWeek <= MAX_WEEKLY_PERIODS &&
    teacher.availableDays.length,
  );
}
