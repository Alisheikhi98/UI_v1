import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveSchoolId } from "@/lib/active-school";
import { repositories, useMockApi } from "@/lib/repositories/configured";
import type { RepositoryBinding } from "@/lib/repositories/configured";
import type {
  ClassAssignmentReplacementInput,
  EntityRepository,
  PaginatedResult,
  RepositoryListParams,
} from "@/lib/repositories";
import type { Class, ClassAssignment, Course, DaySlotGroup, Major, Teacher } from "@/lib/types";
import { publishQuerySnapshot } from "@/lib/query-cache-publication";
import { isClassAssignmentPartialFailure } from "@/lib/api/class-assignment-reconciliation";
import { repositoryQueryKeys } from "@/lib/repository-query-keys";
import { createCompatibleCourse } from "@/lib/course-creation";
import { canLoadClassAssignments } from "@/lib/class-assignment-query";
import { createTeacherCoursesQueryOptions } from "@/lib/teacher-courses";

export { repositoryQueryKeys };

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
  synchronization: {
    invalidationKey?: readonly unknown[];
    onRemoveSuccess?: (id: string) => void | Promise<void>;
  } = {},
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
    const invalidationKey = synchronization.invalidationKey ?? queryKey;
    await queryClient.invalidateQueries({
      queryKey: invalidationKey,
      exact: !synchronization.invalidationKey,
      refetchType: "none",
    });
    await queryClient.refetchQueries(
      {
        queryKey: invalidationKey,
        exact: !synchronization.invalidationKey,
        type: "active",
      },
      { throwOnError: true },
    );
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
    onSuccess: async (_result, id) => {
      await refresh();
      await synchronization.onRemoveSuccess?.(id);
    },
  });

  return {
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    query,
    create: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    isCreating: create.isPending,
    isUpdating: update.isPending,
    isDeleting: remove.isPending,
  };
}

export function useTeachersRepository(
  params: RepositoryListParams = {},
  options: { includeAvailability?: boolean } = {},
) {
  const queryClient = useQueryClient();
  const filters = params.filters ?? {};
  const effectiveParams: RepositoryListParams = Object.prototype.hasOwnProperty.call(
    filters,
    "active",
  )
    ? params
    : { ...params, filters: { ...filters, active: true } };
  const schoolId = useActiveSchoolId();
  const base = useRepository<
    Teacher,
    Parameters<typeof repositories.teachers.repository.create>[0],
    Parameters<typeof repositories.teachers.repository.update>[1]
  >(
    repositoryQueryKeys.teachers(schoolId, keyParams(effectiveParams)),
    repositories.teachers,
    effectiveParams,
    {
      invalidationKey: repositoryQueryKeys.teachersRoot(schoolId),
      onRemoveSuccess: (teacherId) => {
        queryClient.removeQueries({
          queryKey: repositoryQueryKeys.teacherAvailability(schoolId, teacherId),
          exact: true,
        });
        queryClient.removeQueries({
          queryKey: repositoryQueryKeys.teacherCourses(schoolId, teacherId),
          exact: true,
        });
      },
    },
  );
  const availabilityQueries = useQueries({
    queries: base.items.map((teacher) => ({
      queryKey: repositoryQueryKeys.teacherAvailability(schoolId, teacher.id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        repositories.teacherAvailability.list(teacher.id, { signal }),
      enabled: Boolean(options.includeAvailability) && (useMockApi || schoolId !== null),
    })),
  });
  const items = base.items.map((teacher, index) => ({
    ...teacher,
    availableDaySlotIds: (availabilityQueries[index]?.data as string[] | undefined) ?? [],
  }));
  return { ...base, items };
}

export function useTeacherCoursesQuery(teacherId: string | null, enabled = true) {
  const schoolId = useActiveSchoolId();
  return useQuery<Course[]>({
    queryKey: repositoryQueryKeys.teacherCourses(schoolId, teacherId ?? "none"),
    ...createTeacherCoursesQueryOptions(repositories.teacherCourses, teacherId ?? "none"),
    enabled: enabled && Boolean(teacherId) && (useMockApi || schoolId !== null),
  });
}

export function useCoursesRepository(params: RepositoryListParams = {}) {
  const schoolId = useActiveSchoolId();
  const classId = typeof params.filters?.classId === "string" ? params.filters.classId : undefined;
  const queryClient = useQueryClient();
  const base = useRepository(
    repositoryQueryKeys.courses(schoolId, classId),
    classId ? { ...repositories.courses, initialData: undefined } : repositories.courses,
    params,
  );
  const compatibleCreate = useMutation({
    mutationFn: (input: Parameters<typeof repositories.courses.repository.create>[0]) => {
      if (!classId) throw new Error("A class must be selected before creating a course.");
      return createCompatibleCourse({
        repository: repositories.courses.repository,
        queryClient,
        schoolId,
        classId,
        input,
      });
    },
  });

  return {
    ...base,
    create: classId ? compatibleCreate.mutateAsync : base.create,
  };
}

export function useClassesRepository(params: RepositoryListParams = {}) {
  const schoolId = useActiveSchoolId();
  return useRepository(
    repositoryQueryKeys.classes(schoolId, keyParams(params)),
    repositories.classes,
    params,
  );
}

export function useMajorsRepository() {
  return useQuery<Major[]>({
    queryKey: repositoryQueryKeys.majors(),
    queryFn: ({ signal }) => repositories.majors.repository.list({ signal }),
    initialData: useMockApi ? repositories.majors.initialData?.items : undefined,
  });
}

export function useDaySlotsRepository() {
  const schoolId = useActiveSchoolId();
  return useQuery<DaySlotGroup[]>({
    queryKey: repositoryQueryKeys.daySlots(schoolId),
    queryFn: ({ signal }) => repositories.daySlots.listWeek({ signal }),
    enabled: useMockApi || schoolId !== null,
  });
}

export function useTeacherAvailabilityQuery(teacherId: string | null) {
  const schoolId = useActiveSchoolId();
  return useQuery<string[]>({
    queryKey: repositoryQueryKeys.teacherAvailability(schoolId, teacherId ?? "none"),
    queryFn: ({ signal }) => {
      if (!teacherId) throw new Error("A teacher must be selected.");
      return repositories.teacherAvailability.list(teacherId, { signal });
    },
    enabled: Boolean(teacherId) && (useMockApi || schoolId !== null),
  });
}

export function useTeacherAvailabilityMutation() {
  const schoolId = useActiveSchoolId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teacherId, daySlotIds }: { teacherId: string; daySlotIds: readonly string[] }) =>
      repositories.teacherAvailability.replace(teacherId, daySlotIds),
    onSuccess: async (_daySlotIds, variables) => {
      const queryKey = repositoryQueryKeys.teacherAvailability(schoolId, variables.teacherId);
      await queryClient.invalidateQueries({ queryKey, exact: true, refetchType: "none" });
      await queryClient.refetchQueries(
        { queryKey, exact: true, type: "active" },
        { throwOnError: true },
      );
      if (!queryClient.getQueryData<string[]>(queryKey)) {
        throw new Error("پاسخ نهایی زمان‌های حضور از سرور دریافت نشد.");
      }
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
  const scopedInitialData =
    useMockApi && classIds.length > 0 && initialData
      ? {
          ...initialData,
          items: initialData.items.filter((assignment) => classIds.includes(assignment.classId)),
          total: initialData.items.filter((assignment) => classIds.includes(assignment.classId))
            .length,
        }
      : undefined;
  const query = useQuery({
    queryKey,
    ...createListQueryOptions(repository, params),
    initialData: scopedInitialData,
    enabled: canLoadClassAssignments(useMockApi, schoolId, classIds),
  });
  const publishClassSnapshots = (classId: string, serverAssignments: ClassAssignment[]) => {
    const snapshots = queryClient.getQueriesData<PaginatedResult<ClassAssignment>>({
      queryKey: repositoryQueryKeys.assignmentsRoot(schoolId),
    });
    snapshots.forEach(([targetKey, current]) => {
      const targetClassIds = Array.isArray(targetKey[2]) ? targetKey[2].map(String) : [];
      if (!targetClassIds.includes(classId)) return;
      const items = [
        ...(current?.items.filter((assignment) => assignment.classId !== classId) ?? []),
        ...serverAssignments,
      ];
      publishQuerySnapshot(queryClient, targetKey, {
        items,
        total: items.length,
        page: current?.page ?? 1,
        pageSize: Math.max(1, current?.pageSize ?? items.length),
      });
    });
  };
  const replace = useMutation({
    mutationFn: ({
      classId,
      assignments,
    }: {
      classId: string;
      assignments: readonly ClassAssignmentReplacementInput[];
    }) => repository.replaceForClass(classId, assignments),
    onSuccess: (serverAssignments, variables) => {
      publishClassSnapshots(variables.classId, serverAssignments);
    },
    onError: (error, variables) => {
      if (isClassAssignmentPartialFailure(error) && error.refetchError === undefined) {
        publishClassSnapshots(variables.classId, error.serverAssignments);
      }
    },
  });

  return {
    items: query.data?.items ?? ([] as ClassAssignment[]),
    total: query.data?.total ?? 0,
    query,
    replaceForClass: replace.mutateAsync,
  };
}
