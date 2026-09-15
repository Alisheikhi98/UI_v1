import { useState } from "react";
import { TimetableCell } from "@/components/timetable/timetable-cell";
import { getTimetableEntry, type NormalizedTimetable, type TimetableClass } from "@/lib/timetable";
import { cn } from "@/lib/utils";

const DAY_CONTEXT_TONES = ["bg-background", "bg-muted/55 dark:bg-muted/35"] as const;

export function SchoolMasterTimetable({
  timetable,
  classes,
  overview = false,
  stickyContext = true,
}: {
  timetable: NormalizedTimetable;
  classes: TimetableClass[];
  overview?: boolean;
  stickyContext?: boolean;
}) {
  const teacherNames = new Map(timetable.teachers.map((teacher) => [teacher.id, teacher.name]));
  const [highlightedClassId, setHighlightedClassId] = useState<string | null>(null);

  return (
    <div
      className={
        overview
          ? "fullscreen-master-timetable w-max overflow-visible"
          : "timetable-scroll timetable-scroll-shell min-h-0 max-h-[calc(100dvh-15rem)] overflow-auto bg-muted/10"
      }
      data-testid="school-master-scroll"
      dir="rtl"
    >
      <table
        className="school-master-table w-max min-w-full border-separate border-spacing-0 text-sm"
        data-testid="school-master-timetable"
      >
        <thead>
          <tr>
            <th
              className={cn(
                "timetable-sticky-day w-[4.75rem] min-w-[4.75rem] border-b border-l bg-primary/[0.08] px-1.5 py-3 text-center text-xs font-bold text-primary whitespace-nowrap backdrop-blur",
                stickyContext && "sticky right-0 top-0 z-40",
              )}
            >
              روز
            </th>
            <th
              className={cn(
                "timetable-sticky-period w-24 min-w-24 border-b border-l bg-muted/95 px-1.5 py-3 text-center text-xs font-bold whitespace-nowrap backdrop-blur",
                stickyContext && "sticky right-[4.75rem] top-0 z-40",
              )}
            >
              زنگ
            </th>
            {classes.map((classItem) => (
              <th
                key={classItem.id}
                data-class-column={classItem.id}
                className={cn(
                  "min-w-40 border-b border-l bg-primary/[0.055] px-3 py-2.5 text-center backdrop-blur transition-colors",
                  stickyContext && "sticky top-0 z-30",
                  highlightedClassId === classItem.id && "bg-primary/15",
                )}
                onMouseEnter={() => setHighlightedClassId(classItem.id)}
                onMouseLeave={() => setHighlightedClassId(null)}
              >
                <span className="block whitespace-nowrap font-semibold">{classItem.name}</span>
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                  {classItem.shortName}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timetable.days.map((day, dayIndex) =>
            timetable.periods.map((period, periodIndex) => (
              <tr
                key={`${day.id}-${period.id}`}
                className="bg-background"
                data-day-start={periodIndex === 0}
              >
                {periodIndex === 0 && (
                  <th
                    rowSpan={timetable.periods.length}
                    className={cn(
                      "timetable-sticky-day w-[4.75rem] min-w-[4.75rem] border-b border-l border-s-2 border-s-primary/30 px-1.5 text-center text-xs align-middle font-bold text-foreground whitespace-nowrap",
                      stickyContext && "sticky right-0 z-20",
                      DAY_CONTEXT_TONES[dayIndex % DAY_CONTEXT_TONES.length],
                    )}
                    data-testid={`day-group-${day.id}`}
                  >
                    {day.label}
                  </th>
                )}
                <th
                  className={cn(
                    "timetable-sticky-period w-24 min-w-24 border-b border-l px-1.5 py-2 text-center text-xs whitespace-nowrap",
                    stickyContext && "sticky right-[4.75rem] z-20",
                    DAY_CONTEXT_TONES[dayIndex % DAY_CONTEXT_TONES.length],
                  )}
                  title={`${period.label}، ${period.time}`}
                >
                  <span className="block font-bold">{period.label}</span>
                  <span className="mt-1 hidden text-[9px] font-normal text-muted-foreground sm:block">
                    {period.time}
                  </span>
                </th>
                {classes.map((classItem) => {
                  const entry = getTimetableEntry(timetable, day.id, period.id, classItem.id);
                  return (
                    <td
                      key={classItem.id}
                      data-class-column={classItem.id}
                      className={cn(
                        "h-[4.75rem] min-w-40 border-b border-l bg-background/85 p-1.5 text-center align-middle transition-colors hover:bg-accent/25",
                        highlightedClassId === classItem.id && "bg-primary/[0.045]",
                      )}
                    >
                      <TimetableCell
                        entry={entry}
                        secondaryText={entry ? teacherNames.get(entry.teacherId) : undefined}
                      />
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
