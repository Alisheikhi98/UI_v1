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
      className="timetable-scroll max-h-[calc(100vh-16rem)] overflow-auto"
      data-testid={`${mode}-timetable-scroll`}
      dir="rtl"
    >
      <table
        className="w-full min-w-[760px] border-separate border-spacing-0"
        data-testid={`${mode}-timetable`}
      >
        <thead>
          <tr>
            <th className="sticky right-0 top-0 z-30 w-28 min-w-28 border-b border-l bg-muted p-3 text-center">
              زنگ
            </th>
            {timetable.days.map((day) => (
              <th
                key={day.id}
                className="sticky top-0 z-20 min-w-32 border-b border-l bg-muted p-3 text-center"
              >
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timetable.periods.map((period) => (
            <tr key={period.id}>
              <th className="sticky right-0 z-10 border-b border-l bg-background p-3 text-center">
                <span className="block text-sm font-medium">{period.label}</span>
                <span className="mt-1 block whitespace-nowrap text-[10px] font-normal text-muted-foreground">
                  {period.time}
                </span>
              </th>
              {timetable.days.map((day) => {
                const entry = entryBySlot.get(`${day.id}:${period.id}`);
                return (
                  <td key={day.id} className="h-20 border-b border-l p-2 text-center">
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
