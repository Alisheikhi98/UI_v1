import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { schoolRepository, type SchoolFormData } from "@/lib/api/schools-store";
import { setActiveSchoolId, useActiveSchoolId } from "@/lib/active-school";
import { repositoryQueryKeys } from "@/lib/mock-queries";

export const schoolQueryKey = repositoryQueryKeys.schools;

export function useSchoolsRepository() {
  const activeSchoolId = useActiveSchoolId();
  const queryClient = useQueryClient();
  const queryKey = schoolQueryKey(activeSchoolId);
  const query = useQuery({
    queryKey,
    queryFn: () => schoolRepository.getAll(),
    enabled: typeof window !== "undefined",
  });

  useEffect(() => {
    if (activeSchoolId === null && query.data?.[0]) setActiveSchoolId(query.data[0].id);
  }, [activeSchoolId, query.data]);

  const publish = async () => {
    queryClient.setQueryData(queryKey, await schoolRepository.getAll());
  };

  const create = useMutation({
    mutationFn: (data: SchoolFormData) => schoolRepository.create(data),
    onSuccess: async (school) => {
      setActiveSchoolId(school.id);
      await publish();
    },
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
