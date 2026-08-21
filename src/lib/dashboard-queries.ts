import { useQuery } from "@tanstack/react-query";
import { useActiveSchoolId } from "@/lib/active-school";
import { apiRequest } from "@/lib/api/client";
import type { SchoolStatisticsDto } from "@/lib/api/dtos";
import { useSchoolsRepository } from "@/lib/api/school-queries";
import { scheduleApi } from "@/lib/api/schedule-api";
import type { SchoolStatistics } from "@/lib/dashboard-overview";
import { repositories, useMockApi } from "@/lib/repositories/configured";
import { listAllEntities } from "@/lib/repository-list";
import { repositoryQueryKeys } from "@/lib/repository-query-keys";

function mapSchoolStatistics(dto: SchoolStatisticsDto): SchoolStatistics {
  return {
    activeTeacherCount: dto.active_teacher_count,
    activeClassCount: dto.active_class_count,
    activeDayCount: dto.active_day_count,
    activeWeeklySlotCount: dto.active_weekly_slot_count,
    assignedWeeklySlotCount: dto.assigned_weekly_slot_count,
    emptyWeeklySlotCount: dto.empty_weekly_slot_count,
  };
}

async function loadMockStatistics(signal?: AbortSignal): Promise<SchoolStatistics> {
  const [classes, teachers, daySlotGroups] = await Promise.all([
    listAllEntities(repositories.classes.repository, signal),
    listAllEntities(repositories.teachers.repository, signal),
    repositories.daySlots.listWeek({ signal }),
  ]);
  const classIds = classes.map((item) => item.id);
  const assignments =
    classIds.length > 0
      ? (
          await repositories.classAssignments.repository.list({
            filters: { classIds },
            signal,
          })
        ).items
      : [];
  const activeSlots = daySlotGroups.flatMap((group) => group.slots).filter((slot) => slot.active);
  const assignedWeeklySlotCount = assignments.reduce(
    (total, assignment) => total + assignment.weeklyPeriods,
    0,
  );

  return {
    activeTeacherCount: teachers.filter((teacher) => teacher.status === "active").length,
    activeClassCount: classes.length,
    activeDayCount: daySlotGroups.filter((group) => group.slots.some((slot) => slot.active)).length,
    activeWeeklySlotCount: activeSlots.length,
    assignedWeeklySlotCount,
    emptyWeeklySlotCount: Math.max(
      0,
      classes.length * activeSlots.length - assignedWeeklySlotCount,
    ),
  };
}

export function useDashboardOverview() {
  const schoolId = useActiveSchoolId();
  const schools = useSchoolsRepository();
  const school = schools.schools.find((item) => String(item.id) === schoolId) ?? null;
  const statistics = useQuery({
    queryKey: repositoryQueryKeys.schoolStatistics(schoolId),
    queryFn: async ({ signal }) => {
      if (useMockApi) return loadMockStatistics(signal);
      if (!schoolId) throw new Error("An active School is required.");
      const dto = await apiRequest<SchoolStatisticsDto>(`/schools/${Number(schoolId)}/statistics`, {
        signal,
      });
      return mapSchoolStatistics(dto);
    },
    enabled: useMockApi || schoolId !== null,
  });
  const candidates = useQuery({
    queryKey: repositoryQueryKeys.scheduleCandidates(schoolId),
    queryFn: ({ signal }) => {
      if (useMockApi) return [];
      if (!schoolId) throw new Error("An active School is required.");
      return scheduleApi.listCandidates(schoolId, { signal });
    },
    enabled: useMockApi || schoolId !== null,
  });

  return { school, schools, statistics, candidates };
}
