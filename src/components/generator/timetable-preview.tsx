import { useMemo } from "react";
import type { NormalizedTimetable } from "@/lib/timetable";
import { cn } from "@/lib/utils";

export function TimetablePreview({
  timetable,
  compact = false,
}: {
  timetable: NormalizedTimetable;
  compact?: boolean;
}) {
  const entries = useMemo(
    () =>
      new Map(
        timetable.entries.map((entry) => [
          `${entry.dayId}:${entry.periodId}:${entry.classId}`,
          entry,
        ]),
      ),
    [timetable.entries],
  );
  const teacherNames = useMemo(
    () => new Map(timetable.teachers.map((teacher) => [teacher.id, teacher.name])),
    [timetable.teachers],
  );

  if (timetable.classes.length === 0 || timetable.days.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        اطلاعاتی برای نمایش پیش‌نمایش برنامه مدرسه وجود ندارد.
      </p>
    );
  }

  return (
    <div
      className={cn("w-full overflow-auto", compact ? "max-h-80" : "max-h-[calc(92vh-11rem)]")}
      data-testid={compact ? "compact-school-schedule-preview" : "school-candidate-timetable"}
      dir="rtl"
    >
      <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
        <thead>
          <tr>
            <th className="sticky right-0 top-0 z-40 w-20 min-w-20 border-b border-l bg-muted px-2 py-2.5 text-center font-semibold">
              روز
            </th>
            <th className="sticky right-20 top-0 z-40 w-24 min-w-24 border-b border-l bg-muted px-2 py-2.5 text-center font-semibold">
              زنگ
            </th>
            {timetable.classes.map((classItem) => (
              <th
                key={classItem.id}
                className="sticky top-0 z-30 min-w-36 border-b border-l bg-muted px-3 py-2.5 text-center font-semibold"
              >
                <span className="block whitespace-nowrap">{classItem.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timetable.days.map((day, dayIndex) =>
            timetable.periods.map((period, periodIndex) => (
              <tr
                key={`${day.id}-${period.id}`}
                className={dayIndex % 2 === 0 ? "bg-background" : "bg-muted/20"}
              >
                {periodIndex === 0 && (
                  <th
                    rowSpan={timetable.periods.length}
                    className={cn(
                      "sticky right-0 z-20 w-20 min-w-20 border-b border-l px-2 text-center align-middle font-semibold",
                      dayIndex % 2 === 0 ? "bg-background" : "bg-muted",
                    )}
                    data-testid={`candidate-day-group-${day.id}`}
                  >
                    {day.label}
                  </th>
                )}
                <th
                  className={cn(
                    "sticky right-20 z-20 w-24 min-w-24 border-b border-l px-2 py-2 text-center",
                    dayIndex % 2 === 0 ? "bg-background" : "bg-muted",
                  )}
                >
                  <span className="block font-medium">{period.label}</span>
                  <span className="mt-0.5 block whitespace-nowrap text-[10px] font-normal text-muted-foreground">
                    {period.time}
                  </span>
                </th>
                {timetable.classes.map((classItem) => {
                  const entry = entries.get(`${day.id}:${period.id}:${classItem.id}`);
                  return (
                    <td
                      key={classItem.id}
                      className={cn(
                        "min-w-36 border-b border-l px-2 text-center align-middle",
                        compact ? "h-14 py-1.5" : "h-16 py-2",
                      )}
                    >
                      {entry ? (
                        <div className="leading-tight">
                          <p className="truncate font-semibold text-foreground">
                            {entry.courseName}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-muted-foreground">
                            {teacherNames.get(entry.teacherId) ?? "معلم حذف‌شده"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/35">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
