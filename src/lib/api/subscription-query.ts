import { useQuery, type QueryClient } from "@tanstack/react-query";
import { useActiveSchoolId } from "@/lib/active-school";
import type { SchoolSubscriptionDto } from "@/lib/api/dtos";
import { apiRequest } from "@/lib/api/client";
import { toApiId } from "@/lib/api/mappers";
import { repositoryQueryKeys } from "@/lib/repository-query-keys";

export function getSchoolSubscription(
  schoolId: string,
  signal?: AbortSignal,
): Promise<SchoolSubscriptionDto> {
  return apiRequest<SchoolSubscriptionDto>(
    `/schools/${toApiId(schoolId, "schoolId")}/subscription`,
    { signal },
  );
}

export function useSchoolSubscriptionQuery() {
  const schoolId = useActiveSchoolId();
  return useQuery({
    queryKey: repositoryQueryKeys.schoolSubscription(schoolId),
    queryFn: ({ signal }) => getSchoolSubscription(schoolId!, signal),
    enabled: typeof window !== "undefined" && Boolean(schoolId),
    staleTime: 30_000,
    refetchOnWindowFocus: "always",
  });
}

export async function refreshSchoolSubscription(queryClient: QueryClient, schoolId: string) {
  const queryKey = repositoryQueryKeys.schoolSubscription(schoolId);
  await queryClient.invalidateQueries({ queryKey, exact: true, refetchType: "none" });
  await queryClient.refetchQueries({ queryKey, exact: true, type: "active" });
  return queryClient.getQueryData<SchoolSubscriptionDto>(queryKey);
}
