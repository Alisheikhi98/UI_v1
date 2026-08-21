import type { ScheduleCandidateSummary } from "@/lib/scheduler";

export interface SchoolStatistics {
  activeTeacherCount: number;
  activeClassCount: number;
  activeDayCount: number;
  activeWeeklySlotCount: number;
  assignedWeeklySlotCount: number;
  emptyWeeklySlotCount: number;
}

export interface DashboardReadinessBlocker {
  id: "classes" | "teachers" | "calendar" | "assignments";
  label: string;
  href: "/dashboard/classes" | "/dashboard/teachers" | "/dashboard/schools";
}

export function deriveDashboardReadiness(statistics: SchoolStatistics): {
  ready: boolean;
  blockers: DashboardReadinessBlocker[];
} {
  const blockers: DashboardReadinessBlocker[] = [];

  if (statistics.activeClassCount === 0) {
    blockers.push({ id: "classes", label: "هنوز کلاسی ثبت نشده است.", href: "/dashboard/classes" });
  }
  if (statistics.activeTeacherCount === 0) {
    blockers.push({
      id: "teachers",
      label: "هنوز معلم فعالی ثبت نشده است.",
      href: "/dashboard/teachers",
    });
  }
  if (statistics.activeDayCount === 0 || statistics.activeWeeklySlotCount === 0) {
    blockers.push({
      id: "calendar",
      label: "روزها و زنگ‌های مدرسه تنظیم نشده است.",
      href: "/dashboard/schools",
    });
  }
  if (statistics.activeClassCount > 0 && statistics.assignedWeeklySlotCount === 0) {
    blockers.push({
      id: "assignments",
      label: "درس و معلم کلاس‌ها ثبت نشده است.",
      href: "/dashboard/classes",
    });
  }

  return { ready: blockers.length === 0, blockers };
}

export function getPublishedSchedule(
  candidates: readonly ScheduleCandidateSummary[],
): ScheduleCandidateSummary | null {
  return candidates.find((candidate) => candidate.selected) ?? null;
}
