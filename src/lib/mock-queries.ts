import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveSchoolId } from "@/lib/active-school";
import { repositories, useMockApi } from "@/lib/repositories/configured";
import type { RepositoryBinding } from "@/lib/repositories/configured";
import type {
  ClassAssignmentReplacementInput,
  EntityRepository,
  RepositoryListParams,
} from "@/lib/repositories";
import type { Class, ClassAssignment, Course, DaySlot, Teacher } from "@/lib/types";
import { publishQuerySnapshot } from "@/lib/query-cache-publication";

export const repositoryQueryKeys = {
  schools: (schoolId: string | null) => ["schools", schoolId ?? "none"] as const,
  teachers: (schoolId: string | null, params?: unknown) =>
    ["teachers", schoolId ?? "none", params ?? {}] as const,
  teacherAvailability: (schoolId: string | null, teacherId: string) =>
    ["teacher-availability", schoolId ?? "none", teacherId] as const,
  teacherCourses: (schoolId: string | null, teacherId: string) =>
    ["teacher-courses", schoolId ?? "none", teacherId] as const,
  courses: (schoolId: string | null, classId?: string) =>
    [
      classId ? "class-compatible-courses" : "courses",
      schoolId ?? "none",
      classId ?? "all",
    ] as const,
  classes: (schoolId: string | null, params?: unknown) =>
    ["classes", schoolId ?? "none", params ?? {}] as const,
  assignments: (schoolId: string | null, classIds: readonly string[]) =>
    ["class-assignments", schoolId ?? "none", [...classIds].sort()] as const,
  daySlots: (schoolId: string | null) => ["day-slots", schoolId ?? "none"] as const,
};

// Kept as a compatibility export for existing architecture tests.
export const mockQueryKeys = {
  teachers: ["teachers"] as const,
  courses: ["courses"] as const,
  classes: ["classes"] as const,
  assignments: ["class-assignments"] as const,
};

function keyParams(params: RepositoryListParams) {
  const { signal: _signal, ...stable } = params;
  return stable;
}

export function createListQueryOptions<T extends { id: string }>(
  repository: Pick<EntityRepository<T>, "list">,
  params: RepositoryListParams = {},
) {
  return {
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      repository.list({ ...params, signal: signal ?? params.signal }),
  };
}

function useRepository<T extends { id: string }, TCreate, TUpdate>(
  queryKey: readonly unknown[],
  binding: RepositoryBinding<T, EntityRepository<T, TCreate, TUpdate>>,
  params: RepositoryListParams = {},
) {
  const { repository } = binding;
  const activeSchoolId = useActiveSchoolId();
  const enabled = useMockApi || activeSchoolId !== null;
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey,
    ...createListQueryOptions(repository, params),
    initialData: useMockApi ? binding.initialData : undefined,
    enabled,
  });
  const refresh = async () => {
    const result = await repository.list(params);
    publishQuerySnapshot(queryClient, queryKey, result);
  };

  const create = useMutation({
    mutationFn: (input: TCreate) => repository.create(input),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TUpdate }) => repository.update(id, input),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: refresh,
  });

  return {
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    query,
    create: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
  };
}

export function useTeachersRepository(params: RepositoryListParams = {}) {
  const schoolId = useActiveSchoolId();
  const base = useRepository<
    Teacher,
    Parameters<typeof repositories.teachers.repository.create>[0],
    Parameters<typeof repositories.teachers.repository.update>[1]
  >(repositoryQueryKeys.teachers(schoolId, keyParams(params)), repositories.teachers, params);
  const relationQueries = useQueries({
    queries: base.items.flatMap((teacher) => [
      {
        queryKey: repositoryQueryKeys.teacherAvailability(schoolId, teacher.id),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          repositories.teacherAvailability.list(teacher.id, { signal }),
        enabled: useMockApi || schoolId !== null,
      },
      {
        queryKey: repositoryQueryKeys.teacherCourses(schoolId, teacher.id),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          repositories.teacherCourses.list(teacher.id, { signal }),
        enabled: useMockApi || schoolId !== null,
      },
    ]),
  });
  const items = base.items.map((teacher, index) => {
    const availability = relationQueries[index * 2]?.data as string[] | undefined;
    const courses = relationQueries[index * 2 + 1]?.data as Course[] | undefined;
    return {
      ...teacher,
      availableDaySlotIds: availability ?? teacher.availableDaySlotIds,
      courseIds: courses?.map((course) => course.id) ?? teacher.courseIds,
    };
  });
  const relatedCourses = [
    ...new Map(
      relationQueries
        .flatMap((query, index) =>
          index % 2 === 1 ? ((query.data as Course[] | undefined) ?? []) : [],
        )
        .map((course) => [course.id, course]),
    ).values(),
  ];
  return { ...base, items, relatedCourses };
}

export function useCoursesRepository(params: RepositoryListParams = {}) {
  const schoolId = useActiveSchoolId();
  const classId = typeof params.filters?.classId === "string" ? params.filters.classId : undefined;
  return useRepository(
    repositoryQueryKeys.courses(schoolId, classId),
    repositories.courses,
    params,
  );
}

export function useClassesRepository(params: RepositoryListParams = {}) {
  const schoolId = useActiveSchoolId();
  return useRepository(
    repositoryQueryKeys.classes(schoolId, keyParams(params)),
    repositories.classes,
    params,
  );
}

export function useDaySlotsRepository() {
  const schoolId = useActiveSchoolId();
  return useQuery<DaySlot[]>({
    queryKey: repositoryQueryKeys.daySlots(schoolId),
    queryFn: ({ signal }) => repositories.daySlots.list({ signal }),
    enabled: useMockApi || schoolId !== null,
  });
}

export function useTeacherAvailabilityMutation() {
  const schoolId = useActiveSchoolId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teacherId, daySlotIds }: { teacherId: string; daySlotIds: readonly string[] }) =>
      repositories.teacherAvailability.replace(teacherId, daySlotIds),
    onSuccess: (daySlotIds, variables) => {
      queryClient.setQueryData(
        repositoryQueryKeys.teacherAvailability(schoolId, variables.teacherId),
        daySlotIds,
      );
    },
  });
}

export function useClassAssignmentsRepository(params: RepositoryListParams = {}) {
  const schoolId = useActiveSchoolId();
  const classIds = [
    ...(Array.isArray(params.filters?.classIds) ? params.filters.classIds.map(String) : []),
    ...(typeof params.filters?.classId === "string" ? [params.filters.classId] : []),
  ];
  const { repository, initialData } = repositories.classAssignments;
  const queryClient = useQueryClient();
  const queryKey = repositoryQueryKeys.assignments(schoolId, classIds);
  const query = useQuery({
    queryKey,
    ...createListQueryOptions(repository, params),
    initialData: useMockApi ? initialData : undefined,
    enabled: useMockApi || (schoolId !== null && classIds.length > 0),
  });
  const replace = useMutation({
    mutationFn: ({
      classId,
      assignments,
    }: {
      classId: string;
      assignments: readonly ClassAssignmentReplacementInput[];
    }) => repository.replaceForClass(classId, assignments),
    onSuccess: async () => {
      const result = await repository.list(params);
      publishQuerySnapshot(queryClient, queryKey, result);
    },
  });

  return {
    items: query.data?.items ?? ([] as ClassAssignment[]),
    total: query.data?.total ?? 0,
    query,
    replaceForClass: replace.mutateAsync,
  };
}
