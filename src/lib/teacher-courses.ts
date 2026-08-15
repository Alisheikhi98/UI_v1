import type { RepositoryRequestOptions, TeacherCoursesRepository } from "./repositories/contracts";

export function createTeacherCoursesQueryOptions(
  repository: TeacherCoursesRepository,
  teacherId: string,
) {
  return {
    queryFn: ({ signal }: RepositoryRequestOptions = {}) => repository.list(teacherId, { signal }),
    staleTime: 5 * 60 * 1000,
  };
}
