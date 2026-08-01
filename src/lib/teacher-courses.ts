import type { RepositoryRequestOptions, TeacherCoursesRepository } from "./repositories/contracts";

export function createTeacherCoursesQueryOptions(
  repository: TeacherCoursesRepository,
  teacherId: string,
) {
  return {
    queryFn: ({ signal }: RepositoryRequestOptions = {}) => repository.list(teacherId, { signal }),
  };
}
