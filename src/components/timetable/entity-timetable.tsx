import { TimetableCell } from "@/components/timetable/timetable-cell";
import type { NormalizedTimetable, TimetableEntry, TimetableViewMode } from "@/lib/timetable";

export function EntityTimetable({
  timetable,
  mode,
  entityId,
}: {
  timetable: NormalizedTimetable;
  mode: Exclude<TimetableViewMode, "school">;
  entityId: string;
}) {
  const classNames = new Map(timetable.classes.map((item) => [item.id, item.name]));
  const teacherNames = new Map(timetable.teachers.map((item) => [item.id, item.name]));
  const relevantEntries = timetable.entries.filter((entry) =>
    mode === "class" ? entry.classId === entityId : entry.teacherId === entityId,
  );
  const entryBySlot = new Map(
    relevantEntries.map((entry) => [`${entry.dayId}:${entry.periodId}`, entry] as const),
  );
  const secondaryText = (entry: TimetableEntry) =>
    mode === "class" ? teacherNames.get(entry.teacherId) : classNames.get(entry.classId);

  return (
    <div
      className="timetable-scroll timetable-scroll-shell min-h-0 max-h-[calc(100dvh-16rem)] overflow-auto"
      data-testid={`${mode}-timetable-scroll`}
      dir="rtl"
    >
      <table
        className="entity-timetable-table w-full min-w-[720px] border-separate border-spacing-0 bg-muted/10"
        data-testid={`${mode}-timetable`}
      >
        <thead>
          <tr>
            <th className="timetable-sticky-entity-period sticky right-0 top-0 z-30 w-28 min-w-28 border-b border-l bg-muted/95 p-3 text-center text-sm font-bold backdrop-blur">
              زنگ
            </th>
            {timetable.days.map((day) => (
              <th
                key={day.id}
                className="sticky top-0 z-20 min-w-32 border-b border-l bg-primary/[0.08] p-3 text-center text-sm font-bold text-primary backdrop-blur"
              >
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timetable.periods.map((period) => (
            <tr key={period.id} className="bg-background">
              <th className="timetable-sticky-entity-period sticky right-0 z-10 border-b border-l bg-muted/45 p-3 text-center">
                <span className="block text-sm font-bold">{period.label}</span>
                <span className="mt-1 block whitespace-nowrap text-[10px] font-normal text-muted-foreground">
                  {period.time}
                </span>
              </th>
              {timetable.days.map((day) => {
                const entry = entryBySlot.get(`${day.id}:${period.id}`);
                return (
                  <td
                    key={day.id}
                    className="h-20 border-b border-l bg-background/85 p-1.5 text-center align-middle transition-colors hover:bg-accent/25"
                  >
                    <TimetableCell
                      entry={entry}
                      secondaryText={entry ? secondaryText(entry) : undefined}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
