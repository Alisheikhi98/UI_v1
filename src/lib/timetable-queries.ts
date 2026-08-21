import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveSchoolId } from "@/lib/active-school";
import { scheduleApi } from "@/lib/api/schedule-api";
import { useSchoolsRepository } from "@/lib/api/school-queries";
import { repositories, useMockApi } from "@/lib/repositories/configured";
import { listAllEntities } from "@/lib/repository-list";
import { repositoryQueryKeys } from "@/lib/repository-query-keys";
import { normalizeHistoricalCandidate, normalizePublishedTimetable } from "@/lib/timetable";
import type { Class, Major, Teacher } from "@/lib/types";

export function useScheduleHistory(enabled: boolean) {
  const schoolId = useActiveSchoolId();
  return useQuery({
    queryKey: repositoryQueryKeys.scheduleCandidates(schoolId),
    queryFn: ({ signal }) => {
      if (!schoolId) throw new Error("An active School is required.");
      return scheduleApi.listCandidates(schoolId, { signal });
    },
    enabled: enabled && !useMockApi && schoolId !== null,
    staleTime: 30_000,
  });
}

export function useScheduleAssignmentReferences(classIds: readonly string[], enabled = true) {
  const schoolId = useActiveSchoolId();
  return useQuery({
    queryKey: repositoryQueryKeys.scheduleAssignmentReferences(schoolId, classIds),
    queryFn: ({ signal }) =>
      repositories.classAssignments.repository.listScheduleSnapshot({
        filters: { classIds },
        signal,
      }),
    enabled: enabled && (useMockApi || schoolId !== null) && classIds.length > 0,
  });
}

export function useHistoricalCandidateTimetable(candidateId: string | null, enabled: boolean) {
  const schoolId = useActiveSchoolId();
  const schools = useSchoolsRepository();
  const detailEnabled = enabled && !useMockApi && schoolId !== null && candidateId !== null;
  const candidate = useQuery({
    queryKey: repositoryQueryKeys.scheduleCandidate(schoolId, candidateId ?? "none"),
    queryFn: ({ signal }) => {
      if (!schoolId || !candidateId) throw new Error("A candidate and School are required.");
      return scheduleApi.getCandidate(schoolId, candidateId, { signal });
    },
    enabled: detailEnabled,
  });
  const classes = useQuery<Class[]>({
    queryKey: repositoryQueryKeys.classes(schoolId, { scope: "timetable", page: "all" }),
    queryFn: ({ signal }) => listAllEntities(repositories.classes.repository, signal),
    enabled: detailEnabled,
  });
  const teachers = useQuery<Teacher[]>({
    queryKey: repositoryQueryKeys.teachers(schoolId, { scope: "timetable", page: "all" }),
    queryFn: ({ signal }) => listAllEntities(repositories.teachers.repository, signal),
    enabled: detailEnabled,
  });
  const classIds = [...new Set(candidate.data?.lessons.map((lesson) => lesson.classId) ?? [])];
  const assignmentReferences = useScheduleAssignmentReferences(classIds, detailEnabled);
  const daySlots = useQuery({
    queryKey: repositoryQueryKeys.daySlots(schoolId),
    queryFn: ({ signal }) => repositories.daySlots.listWeek({ signal }),
    enabled: detailEnabled,
  });
  const school = schools.schools.find((item) => String(item.id) === schoolId);
  const data = useMemo(() => {
    if (
      !school ||
      !candidate.data ||
      !classes.data ||
      !teachers.data ||
      !assignmentReferences.data ||
      !daySlots.data
    ) {
      return null;
    }
    return normalizeHistoricalCandidate({
      candidate: candidate.data,
      schoolName: school.name,
      classes: classes.data,
      teachers: teachers.data,
      assignmentCourseReferences: assignmentReferences.data.courseReferences,
      daySlotGroups: daySlots.data,
    });
  }, [
    candidate.data,
    classes.data,
    assignmentReferences.data,
    daySlots.data,
    school,
    teachers.data,
  ]);

  return {
    candidate: candidate.data ?? null,
    data,
    isPending:
      detailEnabled &&
      (candidate.isPending ||
        classes.isPending ||
        teachers.isPending ||
        assignmentReferences.isPending ||
        daySlots.isPending),
    isError:
      candidate.isError ||
      classes.isError ||
      teachers.isError ||
      assignmentReferences.isError ||
      daySlots.isError,
    refetch: candidate.refetch,
  };
}

export async function fetchPublishedClassSchedules(
  schoolId: string,
  classIds: readonly string[],
  signal?: AbortSignal,
) {
  return Promise.all(
    classIds.map((classId) => scheduleApi.getClassSchedule(schoolId, classId, { signal })),
  );
}

export function usePublishedClassScheduleCheck() {
  const schoolId = useActiveSchoolId();
  const queryClient = useQueryClient();

  const check = useCallback(
    async (classId: string) => {
      if (useMockApi || !schoolId) {
        throw new Error("Published timetable availability requires an active API School.");
      }

      const schedule = await queryClient.fetchQuery({
        queryKey: repositoryQueryKeys.publishedClassSchedule(schoolId, classId),
        queryFn: ({ signal }) => scheduleApi.getClassSchedule(schoolId, classId, { signal }),
        staleTime: 30_000,
      });

      return schedule.items.length > 0;
    },
    [queryClient, schoolId],
  );

  return { check, canCheck: !useMockApi && schoolId !== null };
}

export function usePublishedClassSchedules(classIds: readonly string[]) {
  const schoolId = useActiveSchoolId();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: repositoryQueryKeys.finalTimetable(schoolId, classIds),
    queryFn: ({ signal }) => {
      if (!schoolId) throw new Error("An active School is required.");
      return Promise.all(
        classIds.map((classId) =>
          queryClient.fetchQuery({
            queryKey: repositoryQueryKeys.publishedClassSchedule(schoolId, classId),
            queryFn: () => scheduleApi.getClassSchedule(schoolId, classId, { signal }),
            staleTime: 30_000,
          }),
        ),
      );
    },
    enabled: !useMockApi && schoolId !== null,
  });
}

export function usePublishedTimetable() {
  const schoolId = useActiveSchoolId();
  const schools = useSchoolsRepository();
  const classes = useQuery<Class[]>({
    queryKey: repositoryQueryKeys.classes(schoolId, { scope: "timetable", page: "all" }),
    queryFn: ({ signal }) => listAllEntities(repositories.classes.repository, signal),
    enabled: !useMockApi && schoolId !== null,
  });
  const teachers = useQuery<Teacher[]>({
    queryKey: repositoryQueryKeys.teachers(schoolId, { scope: "timetable", page: "all" }),
    queryFn: ({ signal }) => listAllEntities(repositories.teachers.repository, signal),
    enabled: !useMockApi && schoolId !== null,
  });
  const majors = useQuery<Major[]>({
    queryKey: repositoryQueryKeys.majors(),
    queryFn: ({ signal }) => repositories.majors.repository.list({ signal }),
    enabled: !useMockApi,
  });
  const daySlots = useQuery({
    queryKey: repositoryQueryKeys.daySlots(schoolId),
    queryFn: ({ signal }) => repositories.daySlots.listWeek({ signal }),
    enabled: !useMockApi && schoolId !== null,
  });
  const classIds = (classes.data ?? []).map((item) => item.id);
  const published = usePublishedClassSchedules(classes.isSuccess ? classIds : []);
  const school = schools.schools.find((item) => String(item.id) === schoolId);
  const data = useMemo(() => {
    if (
      !schoolId ||
      !school ||
      !classes.data ||
      !teachers.data ||
      !majors.data ||
      !daySlots.data ||
      !published.data
    ) {
      return null;
    }
    return normalizePublishedTimetable({
      schoolId,
      schoolName: school.name,
      classes: classes.data,
      teachers: teachers.data,
      majors: majors.data,
      daySlotGroups: daySlots.data,
      classSchedules: published.data,
    });
  }, [classes.data, daySlots.data, majors.data, published.data, school, schoolId, teachers.data]);

  return {
    data,
    isPending:
      !useMockApi &&
      (schools.query.isPending ||
        classes.isPending ||
        teachers.isPending ||
        majors.isPending ||
        daySlots.isPending ||
        published.isPending),
    isError:
      schools.query.isError ||
      classes.isError ||
      teachers.isError ||
      majors.isError ||
      daySlots.isError ||
      published.isError ||
      useMockApi,
    refetch: published.refetch,
  };
}
