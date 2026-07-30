import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repositories } from "@/lib/repositories/configured";
import type { RepositoryBinding } from "@/lib/repositories/configured";
import type {
  ClassAssignmentReplacementInput,
  CreateInput,
  EntityRepository,
  RepositoryListParams,
  UpdateInput,
} from "@/lib/repositories";
import type { Class, ClassAssignment, Course, Teacher } from "@/lib/types";
import { publishQuerySnapshot } from "@/lib/query-cache-publication";

export const mockQueryKeys = {
  teachers: ["mock", "teachers"] as const,
  courses: ["mock", "courses"] as const,
  classes: ["mock", "classes"] as const,
  assignments: ["mock", "class-assignments"] as const,
};

export function createListQueryOptions<T extends { id: string }>(
  repository: Pick<EntityRepository<T>, "list">,
  params: RepositoryListParams = {},
) {
  return {
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      repository.list({ ...params, signal: signal ?? params.signal }),
  };
}

function useRepository<T extends { id: string }>(
  queryKey: readonly string[],
  binding: RepositoryBinding<T, EntityRepository<T>>,
  params: RepositoryListParams = {},
) {
  const { repository } = binding;
  const queryClient = useQueryClient();
  const effectiveQueryKey =
    Object.keys(params).length === 0 ? queryKey : ([...queryKey, params] as const);
  const query = useQuery({
    queryKey: effectiveQueryKey,
    ...createListQueryOptions(repository, params),
    initialData: Object.keys(params).length === 0 ? binding.initialData : undefined,
  });
  const refresh = async () => {
    const result = await repository.list(params);
    queryClient.setQueryData(effectiveQueryKey, result);
  };

  const create = useMutation({
    mutationFn: (input: CreateInput<T>) => repository.create(input),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInput<T> }) =>
      repository.update(id, input),
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

export const useTeachersRepository = (params?: RepositoryListParams) =>
  useRepository<Teacher>(mockQueryKeys.teachers, repositories.teachers, params);
export const useCoursesRepository = (params?: RepositoryListParams) =>
  useRepository<Course>(mockQueryKeys.courses, repositories.courses, params);
export const useClassesRepository = (params?: RepositoryListParams) =>
  useRepository<Class>(mockQueryKeys.classes, repositories.classes, params);

export function useClassAssignmentsRepository(params: RepositoryListParams = {}) {
  const { repository, initialData } = repositories.classAssignments;
  const queryClient = useQueryClient();
  const effectiveQueryKey =
    Object.keys(params).length === 0
      ? mockQueryKeys.assignments
      : ([...mockQueryKeys.assignments, params] as const);
  const query = useQuery({
    queryKey: effectiveQueryKey,
    ...createListQueryOptions(repository, params),
    initialData: Object.keys(params).length === 0 ? initialData : undefined,
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
      publishQuerySnapshot(queryClient, effectiveQueryKey, result);
    },
  });

  return {
    items: query.data?.items ?? ([] as ClassAssignment[]),
    total: query.data?.total ?? 0,
    query,
    replaceForClass: replace.mutateAsync,
  };
}
