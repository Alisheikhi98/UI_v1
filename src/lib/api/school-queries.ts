import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolRepository, type SchoolFormData } from "@/lib/api/schools-store";

export const schoolQueryKey = ["schools"] as const;

export function useSchoolsRepository() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: schoolQueryKey,
    queryFn: () => schoolRepository.getAll(),
    enabled: typeof window !== "undefined",
  });

  const publish = async () => {
    queryClient.setQueryData(schoolQueryKey, await schoolRepository.getAll());
  };

  const create = useMutation({
    mutationFn: (data: SchoolFormData) => schoolRepository.create(data),
    onSuccess: publish,
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SchoolFormData }) =>
      schoolRepository.update(id, data),
    onSuccess: publish,
  });
  const remove = useMutation({
    mutationFn: (id: number) => schoolRepository.delete(id),
    onSuccess: publish,
  });

  return {
    schools: query.data ?? [],
    query,
    create: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
  };
}
