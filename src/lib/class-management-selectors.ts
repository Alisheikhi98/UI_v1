import type { Class, Course, Major, Teacher } from "@/lib/types";

export const GRADE_OPTIONS = [
  { value: "10", label: "پایه دهم" },
  { value: "11", label: "پایه یازدهم" },
  { value: "12", label: "پایه دوازدهم" },
] as const;

const MAJOR_LABELS_BY_CODE: Readonly<Record<string, string>> = {
  math: "ریاضی فیزیک",
  exp: "علوم تجربی",
  hum: "ادبیات و علوم انسانی",
};

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

export const getMajorDisplayName = (major: Pick<Major, "code" | "name">) =>
  MAJOR_LABELS_BY_CODE[major.code.trim().toLocaleLowerCase("en-US")] ?? major.name;

export const selectMajorOptions = (majors: Major[]) =>
  majors
    .filter((major) => major.active)
    .map((major) => ({
      value: major.id,
      label: getMajorDisplayName(major),
    }));

export const resolveMajorName = (majorId: string, majors: Major[]) => {
  const major = majors.find((item) => item.id === majorId);
  return major ? getMajorDisplayName(major) : majorId;
};

export const selectClassViewModels = (classes: Class[], majors: Major[]): ClassViewModel[] =>
  classes.map((schoolClass) => ({
    id: schoolClass.id,
    name: schoolClass.name,
    gradeId: schoolClass.gradeId,
    gradeName: resolveGradeName(schoolClass.gradeId),
    majorId: schoolClass.majorId,
    majorName: resolveMajorName(schoolClass.majorId, majors),
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
