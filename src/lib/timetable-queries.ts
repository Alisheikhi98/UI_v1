import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveSchoolId } from "@/lib/active-school";
import { scheduleApi } from "@/lib/api/schedule-api";
import { useSchoolsRepository } from "@/lib/api/school-queries";
import { repositories, useMockApi } from "@/lib/repositories/configured";
import { listAllEntities } from "@/lib/repository-list";
import { repositoryQueryKeys } from "@/lib/repository-query-keys";
import { normalizePublishedTimetable } from "@/lib/timetable";
import type { Class, Major, Teacher } from "@/lib/types";

export async function fetchPublishedClassSchedules(
  schoolId: string,
  classIds: readonly string[],
  signal?: AbortSignal,
) {
  return Promise.all(
    classIds.map((classId) => scheduleApi.getClassSchedule(schoolId, classId, { signal })),
  );
}

export function usePublishedClassSchedules(classIds: readonly string[]) {
  const schoolId = useActiveSchoolId();
  return useQuery({
    queryKey: repositoryQueryKeys.finalTimetable(schoolId, classIds),
    queryFn: ({ signal }) => {
      if (!schoolId) throw new Error("An active School is required.");
      return fetchPublishedClassSchedules(schoolId, classIds, signal);
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
