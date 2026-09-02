import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveSchoolId } from "@/lib/active-school";
import { ApiError } from "@/lib/api/client";
import { repositories, useMockApi } from "@/lib/repositories/configured";
import { repositoryQueryKeys } from "@/lib/repository-query-keys";
import type { DaySlotGroup } from "@/lib/types";

export function selectValidUnavailableSlotIds(
  daySlotIds: readonly string[],
  groups: readonly DaySlotGroup[],
) {
  const activeIds = new Set(
    groups.flatMap((group) => group.slots.filter((slot) => slot.active).map((slot) => slot.id)),
  );
  return new Set(daySlotIds.filter((daySlotId) => activeIds.has(daySlotId)));
}

export function toggleUnavailableSlotSelection(current: ReadonlySet<string>, daySlotId: string) {
  const next = new Set(current);
  if (next.has(daySlotId)) next.delete(daySlotId);
  else next.add(daySlotId);
  return next;
}

export function useClassUnavailableSlots(classId: string | null) {
  const schoolId = useActiveSchoolId();

  return useQuery<string[]>({
    queryKey: repositoryQueryKeys.classUnavailableSlots(schoolId, classId ?? "none"),
    queryFn: ({ signal }) => {
      if (!classId) throw new Error("A Class is required.");
      return repositories.classUnavailableSlots.list(classId, { signal });
    },
    enabled: Boolean(classId) && (useMockApi || schoolId !== null),
  });
}

export function useReplaceClassUnavailableSlots() {
  const schoolId = useActiveSchoolId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classId, daySlotIds }: { classId: string; daySlotIds: readonly string[] }) =>
      repositories.classUnavailableSlots.replace(classId, daySlotIds),
    onSuccess: async (_savedIds, variables) => {
      const queryKey = repositoryQueryKeys.classUnavailableSlots(schoolId, variables.classId);
      await queryClient.invalidateQueries({ queryKey, exact: true, refetchType: "none" });
      await queryClient.refetchQueries(
        { queryKey, exact: true, type: "active" },
        { throwOnError: true },
      );
      await queryClient.invalidateQueries({
        queryKey: repositoryQueryKeys.finalTimetableRoot(schoolId),
      });
    },
  });
}

export function getClassUnavailableSlotsErrorMessage(error: unknown, operation: "load" | "save") {
  const fallback =
    operation === "load" ? "اطلاعات روز و زنگ خالی دریافت نشد." : "ذخیره روز و زنگ خالی انجام نشد.";

  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 0) return "ارتباط با سرور برقرار نشد.";
  if (error.status === 401) return "نشست شما پایان یافته است. دوباره وارد شوید.";
  if (error.status === 403) return "اجازه تغییر روز و زنگ خالی این کلاس را ندارید.";
  if (error.status === 404) return "کلاس یا زنگ انتخاب‌شده در این مدرسه پیدا نشد.";
  if (error.status === 409) return "این تنظیم با اطلاعات فعلی برنامه مدرسه تداخل دارد.";
  if (error.status === 422 || error.status === 400) return "زنگ‌های انتخاب‌شده معتبر نیستند.";
  if (error.status === 429) return "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد تلاش کنید.";
  return fallback;
}
