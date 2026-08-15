import { TimetableCell } from "@/components/timetable/timetable-cell";
import { getTimetableEntry, type NormalizedTimetable, type TimetableClass } from "@/lib/timetable";

export function SchoolMasterTimetable({
  timetable,
  classes,
}: {
  timetable: NormalizedTimetable;
  classes: TimetableClass[];
}) {
  const teacherNames = new Map(timetable.teachers.map((teacher) => [teacher.id, teacher.name]));

  return (
    <div
      className="timetable-scroll max-h-[calc(100vh-15rem)] overflow-auto"
      data-testid="school-master-scroll"
      dir="rtl"
    >
      <table
        className="w-max min-w-full border-separate border-spacing-0 text-sm"
        data-testid="school-master-timetable"
      >
        <thead>
          <tr>
            <th className="sticky right-0 top-0 z-40 w-24 min-w-24 border-b border-l bg-muted px-3 py-3 text-center font-semibold">
              روز
            </th>
            <th className="sticky right-24 top-0 z-40 w-28 min-w-28 border-b border-l bg-muted px-3 py-3 text-center font-semibold">
              زنگ
            </th>
            {classes.map((classItem) => (
              <th
                key={classItem.id}
                className="sticky top-0 z-30 min-w-40 border-b border-l bg-muted px-3 py-2.5 text-center"
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
                className={dayIndex % 2 === 0 ? "bg-background" : "bg-muted/20"}
              >
                {periodIndex === 0 && (
                  <th
                    rowSpan={timetable.periods.length}
                    className={`sticky right-0 z-20 w-24 min-w-24 border-b border-l px-3 text-center align-middle font-semibold ${dayIndex % 2 === 0 ? "bg-background" : "bg-muted"}`}
                    data-testid={`day-group-${day.id}`}
                  >
                    {day.label}
                  </th>
                )}
                <th
                  className={`sticky right-24 z-20 w-28 min-w-28 border-b border-l px-2 py-3 text-center ${dayIndex % 2 === 0 ? "bg-background" : "bg-muted"}`}
                >
                  <span className="block font-medium">{period.label}</span>
                  <span className="mt-1 block whitespace-nowrap text-[10px] font-normal text-muted-foreground">
                    {period.time}
                  </span>
                </th>
                {classes.map((classItem) => {
                  const entry = getTimetableEntry(timetable, day.id, period.id, classItem.id);
                  return (
                    <td
                      key={classItem.id}
                      className="h-16 min-w-40 border-b border-l px-3 py-2 text-center align-middle"
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
