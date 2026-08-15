import { useMemo } from "react";
import type { ScheduleCandidateDetail } from "@/lib/scheduler";
import type { Class, Course, DaySlotGroup, Teacher } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getWeekdayDisplayLabel } from "@/lib/weekday-labels";

export function TimetablePreview({
  candidate,
  daySlotGroups,
  classes,
  teachers,
  courses,
  compact = false,
}: {
  candidate: ScheduleCandidateDetail;
  daySlotGroups: DaySlotGroup[];
  classes: Class[];
  teachers: Teacher[];
  courses: Course[];
  compact?: boolean;
}) {
  const scheduledClassIds = useMemo(
    () => new Set(candidate.lessons.map((lesson) => lesson.classId)),
    [candidate.lessons],
  );
  const scheduledClasses = useMemo(
    () => classes.filter((item) => scheduledClassIds.has(item.id)),
    [classes, scheduledClassIds],
  );
  const teacherNames = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher.name])),
    [teachers],
  );
  const courseNames = useMemo(
    () => new Map(courses.map((course) => [course.id, course.name])),
    [courses],
  );
  const activeDays = useMemo(
    () =>
      daySlotGroups
        .map((group) => ({
          ...group,
          slots: group.slots
            .filter((slot) => slot.active)
            .sort((left, right) => left.slotNumber - right.slotNumber),
        }))
        .filter((group) => group.slots.length > 0),
    [daySlotGroups],
  );

  if (scheduledClasses.length === 0 || activeDays.length === 0) {
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
            {scheduledClasses.map((classItem) => (
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
          {activeDays.map((day, dayIndex) =>
            day.slots.map((slot, slotIndex) => (
              <tr
                key={`${day.dayId}-${slot.id}`}
                className={dayIndex % 2 === 0 ? "bg-background" : "bg-muted/20"}
              >
                {slotIndex === 0 && (
                  <th
                    rowSpan={day.slots.length}
                    className={cn(
                      "sticky right-0 z-20 w-20 min-w-20 border-b border-l px-2 text-center align-middle font-semibold",
                      dayIndex % 2 === 0 ? "bg-background" : "bg-muted",
                    )}
                    data-testid={`candidate-day-group-${day.dayId}`}
                  >
                    {getWeekdayDisplayLabel(day.dayName)}
                  </th>
                )}
                <th
                  className={cn(
                    "sticky right-20 z-20 w-24 min-w-24 border-b border-l px-2 py-2 text-center",
                    dayIndex % 2 === 0 ? "bg-background" : "bg-muted",
                  )}
                >
                  <span className="block font-medium">
                    زنگ {slot.slotNumber.toLocaleString("fa-IR")}
                  </span>
                  {slot.startTime && slot.endTime && (
                    <span className="mt-0.5 block whitespace-nowrap text-[10px] font-normal text-muted-foreground">
                      {slot.startTime.slice(0, 5)} تا {slot.endTime.slice(0, 5)}
                    </span>
                  )}
                </th>
                {scheduledClasses.map((classItem) => {
                  const lesson = candidate.lessons.find(
                    (item) => item.classId === classItem.id && item.daySlotId === slot.id,
                  );
                  return (
                    <td
                      key={classItem.id}
                      className={cn(
                        "min-w-36 border-b border-l px-2 text-center align-middle",
                        compact ? "h-14 py-1.5" : "h-16 py-2",
                      )}
                    >
                      {lesson ? (
                        <div className="leading-tight">
                          <p className="truncate font-semibold text-foreground">
                            {courseNames.get(lesson.courseId) ?? "درس ثبت‌شده"}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-muted-foreground">
                            {teacherNames.get(lesson.teacherId) ?? "معلم ثبت‌شده"}
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
