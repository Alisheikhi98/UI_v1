import { BookOpenCheck, CalendarCheck2, CircleMinus } from "lucide-react";
import type { NormalizedTimetable, TimetableClass } from "@/lib/timetable";

export function TimetableSummary({
  timetable,
  classes,
}: {
  timetable: NormalizedTimetable;
  classes: TimetableClass[];
}) {
  const visibleClassIds = new Set(classes.map((item) => item.id));
  const occupiedSlots = new Set(
    timetable.entries
      .filter((entry) => visibleClassIds.has(entry.classId))
      .map((entry) => `${entry.classId}:${entry.dayId}:${entry.periodId}`),
  ).size;
  const totalSlots = classes.length * timetable.days.length * timetable.periods.length;
  const emptySlots = Math.max(0, totalSlots - occupiedSlots);
  const metrics = [
    { label: "کلاس", value: classes.length, icon: BookOpenCheck },
    { label: "جلسه برنامه‌ریزی‌شده", value: occupiedSlots, icon: CalendarCheck2 },
    { label: "زنگ خالی", value: emptySlots, icon: CircleMinus },
  ];

  return (
    <div
      className="print-hidden flex flex-wrap items-center gap-2 sm:justify-end"
      data-testid="timetable-summary"
      aria-label="خلاصه برنامه مدرسه"
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.035] px-2.5 text-xs text-muted-foreground"
          >
            <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span className="font-semibold text-foreground">
              {metric.value.toLocaleString("fa-IR")}
            </span>
            <span>{metric.label}</span>
          </div>
        );
      })}
    </div>
  );
}
