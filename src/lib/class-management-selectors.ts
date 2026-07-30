import type { Class, Course, Teacher } from "@/lib/types";

export const GRADE_OPTIONS = [
  { value: "10", label: "پایه دهم" },
  { value: "11", label: "پایه یازدهم" },
  { value: "12", label: "پایه دوازدهم" },
] as const;

export const MAJOR_OPTIONS = [
  { value: "major-1", label: "ریاضی فیزیک" },
  { value: "major-2", label: "علوم تجربی" },
  { value: "major-3", label: "ادبیات و علوم انسانی" },
] as const;

export interface ClassViewModel {
  id: string;
  name: string;
  gradeId: string;
  gradeName: string;
  majorId: string;
  majorName: string;
  studentCapacity: number;
}

export interface PickerOption {
  id: string;
  label: string;
  searchText: string;
}

export const resolveGradeName = (gradeId: string) =>
  GRADE_OPTIONS.find((grade) => grade.value === gradeId)?.label ?? `پایه ${gradeId}`;

export const resolveMajorName = (majorId: string) =>
  MAJOR_OPTIONS.find((major) => major.value === majorId)?.label ?? majorId;

export const selectClassViewModels = (classes: Class[]): ClassViewModel[] =>
  classes.map((schoolClass) => ({
    id: schoolClass.id,
    name: schoolClass.name,
    gradeId: schoolClass.gradeId,
    gradeName: resolveGradeName(schoolClass.gradeId),
    majorId: schoolClass.majorId,
    majorName: resolveMajorName(schoolClass.majorId),
    studentCapacity: schoolClass.studentCapacity,
  }));

export const selectCoursePickerOptions = (courses: Course[]): PickerOption[] =>
  courses
    .filter((course) => course.active)
    .map((course) => ({
      id: course.id,
      label: course.name,
      searchText: `${course.name} ${course.code}`.trim(),
    }));

export const selectTeacherPickerOptions = (teachers: Teacher[]): PickerOption[] =>
  teachers
    .filter((teacher) => teacher.status === "active")
    .map((teacher) => ({
      id: teacher.id,
      label: teacher.name,
      searchText: `${teacher.name} ${teacher.personnel_code ?? ""}`.trim(),
    }));
