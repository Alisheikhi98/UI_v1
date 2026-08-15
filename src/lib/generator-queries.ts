import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveSchoolId } from "@/lib/active-school";
import { scheduleApi } from "@/lib/api/schedule-api";
import { useClassAssignmentsRepository, useDaySlotsRepository } from "@/lib/mock-queries";
import { repositories, useMockApi } from "@/lib/repositories/configured";
import { repositoryQueryKeys } from "@/lib/repository-query-keys";
import { listAllEntities } from "@/lib/repository-list";
import { deriveGeneratorReadiness } from "@/lib/scheduler";
import { fetchPublishedClassSchedules } from "@/lib/timetable-queries";
import type { Class, Teacher } from "@/lib/types";

export function useGeneratorReadiness() {
  const schoolId = useActiveSchoolId();
  const classes = useQuery<Class[]>({
    queryKey: repositoryQueryKeys.classes(schoolId, { scope: "generator", page: "all" }),
    queryFn: ({ signal }) => listAllEntities(repositories.classes.repository, signal),
    enabled: useMockApi || schoolId !== null,
  });
  const teachers = useQuery<Teacher[]>({
    queryKey: repositoryQueryKeys.teachers(schoolId, { scope: "generator", page: "all" }),
    queryFn: ({ signal }) => listAllEntities(repositories.teachers.repository, signal),
    enabled: useMockApi || schoolId !== null,
  });
  const daySlots = useDaySlotsRepository();
  const classItems = classes.data ?? [];
  const teacherItems = teachers.data ?? [];
  const classIds = classItems.map((item) => item.id);
  const assignments = useClassAssignmentsRepository({ filters: { classIds } });
  const teacherIds = [...new Set(assignments.items.map((item) => item.teacherId))];
  const availabilityQueries = useQueries({
    queries: teacherIds.map((teacherId) => ({
      queryKey: repositoryQueryKeys.teacherAvailability(schoolId, teacherId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        repositories.teacherAvailability.list(teacherId, { signal }),
      enabled: useMockApi || schoolId !== null,
      staleTime: 5 * 60 * 1000,
    })),
  });
  const availabilityByTeacher = new Map(
    teacherIds.map((teacherId, index) => [teacherId, availabilityQueries[index]?.data ?? []]),
  );
  const loading =
    classes.isPending ||
    teachers.isPending ||
    daySlots.isPending ||
    (classIds.length > 0 && assignments.query.isPending) ||
    availabilityQueries.some((query) => query.isPending);
  const error =
    classes.error ??
    teachers.error ??
    daySlots.error ??
    assignments.query.error ??
    availabilityQueries.find((query) => query.error)?.error ??
    null;

  return {
    data: deriveGeneratorReadiness({
      classes: classItems,
      assignments: assignments.items,
      teachers: teacherItems,
      daySlotGroups: daySlots.data ?? [],
      availabilityByTeacher,
    }),
    loading,
    error,
    classes: classItems,
    teachers: teacherItems,
    daySlotGroups: daySlots.data ?? [],
  };
}

export function useScheduleCandidate(candidateId: string | null) {
  const schoolId = useActiveSchoolId();
  return useQuery({
    queryKey: repositoryQueryKeys.scheduleCandidate(schoolId, candidateId ?? "none"),
    queryFn: ({ signal }) => {
      if (!schoolId || !candidateId) throw new Error("A candidate and School are required.");
      return scheduleApi.getCandidate(schoolId, candidateId, { signal });
    },
    enabled: !useMockApi && schoolId !== null && candidateId !== null,
  });
}

export function useGenerateSchedule() {
  const schoolId = useActiveSchoolId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (useMockApi) throw new Error("تولید برنامه واقعی در حالت آزمایشی در دسترس نیست.");
      if (!schoolId) throw new Error("مدرسه فعال مشخص نشده است.");
      return scheduleApi.generate(schoolId);
    },
    onSuccess: async (result) => {
      if (!schoolId || !result.success || !result.candidateId) return;
      await queryClient.fetchQuery({
        queryKey: repositoryQueryKeys.scheduleCandidate(schoolId, result.candidateId),
        queryFn: ({ signal }) =>
          scheduleApi.getCandidate(schoolId, result.candidateId!, { signal }),
      });
    },
  });
}

export function useConfirmSchedule(classIds: readonly string[]) {
  const schoolId = useActiveSchoolId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (candidateId: string) => {
      if (useMockApi) throw new Error("ثبت برنامه نهایی در حالت آزمایشی در دسترس نیست.");
      if (!schoolId) throw new Error("مدرسه فعال مشخص نشده است.");
      const confirmation = await scheduleApi.confirmCandidate(schoolId, candidateId);
      const timetableKey = repositoryQueryKeys.finalTimetable(schoolId, classIds);
      await queryClient.invalidateQueries({
        queryKey: repositoryQueryKeys.finalTimetableRoot(schoolId),
        refetchType: "none",
      });
      const classSchedules = await queryClient.fetchQuery({
        queryKey: timetableKey,
        queryFn: ({ signal }) => fetchPublishedClassSchedules(schoolId, classIds, signal),
      });
      const savedLessons = classSchedules.reduce((total, item) => total + item.items.length, 0);
      if (savedLessons !== confirmation.savedLessons) {
        throw new Error("The authoritative timetable does not match the confirmation response.");
      }
      const confirmedCandidate = await queryClient.fetchQuery({
        queryKey: repositoryQueryKeys.scheduleCandidate(schoolId, candidateId),
        queryFn: ({ signal }) => scheduleApi.getCandidate(schoolId, candidateId, { signal }),
      });
      if (!confirmedCandidate.selected) {
        throw new Error("The server did not mark the schedule candidate as selected.");
      }
      return confirmation;
    },
  });
}
