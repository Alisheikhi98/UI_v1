import type { QueryClient } from "@tanstack/react-query";
import type { CourseCreateInput, CourseRepository } from "@/lib/repositories";
import type { Class, Course } from "@/lib/types";
import { repositoryQueryKeys } from "./repository-query-keys.ts";

export class IncompatibleCreatedCourseError extends Error {
  readonly course: Course;

  constructor(course: Course) {
    super(
      `درس «${course.name}» ایجاد شد، اما با مشخصات تحصیلی این کلاس سازگار نیست و قابل انتخاب نیست.`,
    );
    this.name = "IncompatibleCreatedCourseError";
    this.course = course;
  }
}

export function createCourseInputForClass(
  selectedClass: Pick<Class, "gradeId" | "majorId">,
  name: string,
): CourseCreateInput {
  return {
    name,
    gradeId: selectedClass.gradeId,
    majorId: selectedClass.majorId,
    category: selectedClass.majorId === null ? "general" : "specialized",
    active: true,
  };
}

export function selectCreatedCourseInDraft<T extends { draftId: string; courseId: string }>(
  draft: readonly T[],
  targetDraftId: string,
  courseId: string,
): T[] {
  return draft.map((item) => (item.draftId === targetDraftId ? { ...item, courseId } : item));
}

export async function createCompatibleCourse({
  repository,
  queryClient,
  schoolId,
  classId,
  input,
}: {
  repository: Pick<CourseRepository, "create" | "list">;
  queryClient: QueryClient;
  schoolId: string | null;
  classId: string;
  input: CourseCreateInput;
}): Promise<Course> {
  const createdCourse = await repository.create(input);
  const schoolCoursesKey = repositoryQueryKeys.courses(schoolId);
  const compatibleCoursesKey = repositoryQueryKeys.courses(schoolId, classId);

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: schoolCoursesKey,
      exact: true,
      refetchType: "none",
    }),
    queryClient.invalidateQueries({
      queryKey: compatibleCoursesKey,
      exact: true,
      refetchType: "none",
    }),
  ]);

  await queryClient.fetchQuery({
    queryKey: schoolCoursesKey,
    queryFn: ({ signal }) => repository.list({ signal }),
  });
  const compatibleCourses = await queryClient.fetchQuery({
    queryKey: compatibleCoursesKey,
    queryFn: ({ signal }) => repository.list({ filters: { classId }, signal }),
  });

  if (!compatibleCourses.items.some((course) => course.id === createdCourse.id)) {
    throw new IncompatibleCreatedCourseError(createdCourse);
  }

  return createdCourse;
}
