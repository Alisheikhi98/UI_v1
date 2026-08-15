export const TEACHER_COURSE_VISIBLE_LIMIT = 3;

export interface TeacherCourseLabelModel {
  visibleLabels: string[];
  hiddenLabels: string[];
  hiddenCount: number;
}

export function createTeacherCourseLabelModel(labels: readonly string[]): TeacherCourseLabelModel {
  const visibleLabels = labels.slice(0, TEACHER_COURSE_VISIBLE_LIMIT);
  const hiddenLabels = labels.slice(TEACHER_COURSE_VISIBLE_LIMIT);
  return {
    visibleLabels,
    hiddenLabels,
    hiddenCount: hiddenLabels.length,
  };
}
