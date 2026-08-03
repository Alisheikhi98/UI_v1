import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { schoolRepository, type School, type SchoolFormData } from "@/lib/api/schools-store";
import { resolveActiveSchoolId, setActiveSchoolId, useActiveSchoolId } from "@/lib/active-school";
import { repositoryQueryKeys } from "@/lib/repository-query-keys";

export const schoolQueryKey = repositoryQueryKeys.schools;

export function useSchoolsRepository() {
  const activeSchoolId = useActiveSchoolId();
  const queryClient = useQueryClient();
  const queryKey = schoolQueryKey();
  const query = useQuery({
    queryKey,
    queryFn: () => schoolRepository.getAll(),
    enabled: typeof window !== "undefined",
  });

  useEffect(() => {
    if (!query.data) return;
    const resolvedSchoolId = resolveActiveSchoolId(
      activeSchoolId,
      query.data.slice(0, 1).map((school) => school.id),
    );
    if (resolvedSchoolId !== activeSchoolId) setActiveSchoolId(resolvedSchoolId);
  }, [activeSchoolId, query.data]);

  const refetchAuthoritativeSchools = async () => {
    await queryClient.invalidateQueries({ queryKey, exact: true, refetchType: "none" });
    await queryClient.refetchQueries({ queryKey, exact: true, type: "active" });
    const refreshed = queryClient.getQueryData<School[]>(queryKey);
    if (!refreshed) throw new Error("پاسخ نهایی مدارس از سرور دریافت نشد.");
    return refreshed;
  };

  const recoverAuthoritativeSchools = async () => {
    try {
      await refetchAuthoritativeSchools();
    } catch {
      // Preserve the mutation error; the visible query retains its own refetch error state.
    }
  };

  const create = useMutation({
    mutationFn: (data: SchoolFormData) => schoolRepository.create(data),
    onSuccess: async (school) => {
      const confirmedSchools = await refetchAuthoritativeSchools();
      const confirmedSchool = confirmedSchools.find((item) => item.id === school.id);
      if (!confirmedSchool)
        throw new Error("مدرسه ایجاد شد اما تأیید نهایی آن از سرور دریافت نشد.");
      setActiveSchoolId(confirmedSchool.id);
    },
    onError: recoverAuthoritativeSchools,
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SchoolFormData }) =>
      schoolRepository.update(id, data),
    onSuccess: refetchAuthoritativeSchools,
    onError: recoverAuthoritativeSchools,
  });

  return {
    schools: query.data?.slice(0, 1) ?? [],
    query,
    create: create.mutateAsync,
    update: update.mutateAsync,
    isCreating: create.isPending,
    isUpdating: update.isPending,
  };
}
