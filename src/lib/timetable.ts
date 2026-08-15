import { resolveGradeName, resolveMajorName } from "@/lib/class-management-selectors";
import type { PublishedClassSchedule } from "@/lib/scheduler";
import type { Class, DaySlotGroup, Major, Teacher } from "@/lib/types";
import { getWeekdayDisplayLabel } from "@/lib/weekday-labels";

export type TimetableViewMode = "school" | "class" | "teacher";

export interface TimetableDay {
  id: string;
  backendName: string;
  label: string;
}

export interface TimetablePeriod {
  id: string;
  slotNumber: number;
  label: string;
  time: string;
}

export interface TimetableClass {
  id: string;
  name: string;
  shortName: string;
  gradeId: string;
  gradeLabel: string;
  majorId: string;
  majorLabel: string;
}

export interface TimetableTeacher {
  id: string;
  name: string;
}

export interface TimetableEntry {
  id: string;
  dayId: string;
  periodId: string;
  classId: string;
  teacherId: string;
  courseId: string;
  courseName: string;
}

export interface NormalizedTimetable {
  id: string;
  schoolName: string;
  days: TimetableDay[];
  periods: TimetablePeriod[];
  classes: TimetableClass[];
  teachers: TimetableTeacher[];
  entries: TimetableEntry[];
}

export interface SchoolTimetableFilters {
  gradeId: string;
  majorId: string;
  search: string;
}

function periodId(slotNumber: number) {
  return `slot-${slotNumber}`;
}

function displayTime(startTime: string | null, endTime: string | null) {
  if (!startTime || !endTime) return "زمان ثبت نشده";
  return `${startTime.slice(0, 5)} تا ${endTime.slice(0, 5)}`;
}

export function normalizePublishedTimetable({
  schoolId,
  schoolName,
  classes,
  teachers,
  majors,
  daySlotGroups,
  classSchedules,
}: {
  schoolId: string;
  schoolName: string;
  classes: readonly Class[];
  teachers: readonly Teacher[];
  majors: readonly Major[];
  daySlotGroups: readonly DaySlotGroup[];
  classSchedules: readonly PublishedClassSchedule[];
}): NormalizedTimetable {
  const scheduleItems = classSchedules.flatMap((schedule) =>
    schedule.items.map((item) => ({ ...item, classId: schedule.classId })),
  );
  const activeGroups = daySlotGroups
    .map((group) => ({ ...group, slots: group.slots.filter((slot) => slot.active) }))
    .filter((group) => group.slots.length > 0);
  const fallbackDays = new Map(scheduleItems.map((item) => [item.dayId, item.dayName] as const));
  const days =
    activeGroups.length > 0
      ? activeGroups.map((group) => ({
          id: String(group.dayId),
          backendName: group.dayName,
          label: getWeekdayDisplayLabel(group.dayName),
        }))
      : [...fallbackDays].map(([id, backendName]) => ({
          id,
          backendName,
          label: getWeekdayDisplayLabel(backendName),
        }));
  const slotsByNumber = new Map<number, { startTime: string | null; endTime: string | null }>();
  activeGroups.forEach((group) =>
    group.slots.forEach((slot) => {
      if (!slotsByNumber.has(slot.slotNumber)) {
        slotsByNumber.set(slot.slotNumber, {
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }),
  );
  scheduleItems.forEach((item) => {
    if (!slotsByNumber.has(item.slotNumber)) {
      slotsByNumber.set(item.slotNumber, {
        startTime: item.startTime,
        endTime: item.endTime,
      });
    }
  });
  const periods = [...slotsByNumber]
    .sort(([left], [right]) => left - right)
    .map(([slotNumber, time]) => ({
      id: periodId(slotNumber),
      slotNumber,
      label: `زنگ ${slotNumber.toLocaleString("fa-IR")}`,
      time: displayTime(time.startTime, time.endTime),
    }));
  const timetableClasses = classes.map((item) => {
    const gradeLabel = resolveGradeName(item.gradeId);
    const majorLabel = resolveMajorName(item.majorId, [...majors]);
    return {
      id: item.id,
      name: item.name,
      shortName: `${gradeLabel} • ${majorLabel}`,
      gradeId: item.gradeId,
      gradeLabel,
      majorId: item.majorId,
      majorLabel,
    };
  });
  const teacherMap = new Map(teachers.map((teacher) => [teacher.id, teacher.name]));
  scheduleItems.forEach((item) => {
    if (item.teacherId && item.teacherName) teacherMap.set(item.teacherId, item.teacherName);
  });

  return {
    id: `published-${schoolId}`,
    schoolName,
    days,
    periods,
    classes: timetableClasses,
    teachers: [...teacherMap].map(([id, name]) => ({ id, name })),
    entries: scheduleItems.map((item) => ({
      id: item.id,
      dayId: item.dayId,
      periodId: periodId(item.slotNumber),
      classId: item.classId,
      teacherId: item.teacherId ?? "",
      courseId: item.courseId,
      courseName: item.courseName,
    })),
  };
}

export function filterTimetableClasses(
  timetableClasses: TimetableClass[],
  filters: SchoolTimetableFilters,
) {
  const normalizedSearch = filters.search.trim().toLocaleLowerCase("fa-IR");
  return timetableClasses.filter((classItem) => {
    const matchesGrade = filters.gradeId === "all" || classItem.gradeId === filters.gradeId;
    const matchesMajor = filters.majorId === "all" || classItem.majorId === filters.majorId;
    const matchesSearch =
      !normalizedSearch ||
      `${classItem.name} ${classItem.shortName}`
        .toLocaleLowerCase("fa-IR")
        .includes(normalizedSearch);
    return matchesGrade && matchesMajor && matchesSearch;
  });
}

export function getTimetableEntry(
  timetable: NormalizedTimetable,
  dayId: string,
  currentPeriodId: string,
  classId: string,
) {
  return timetable.entries.find(
    (entry) =>
      entry.dayId === dayId && entry.periodId === currentPeriodId && entry.classId === classId,
  );
}

export function getTeacherEntries(timetable: NormalizedTimetable, teacherId: string) {
  return timetable.entries.filter((entry) => entry.teacherId === teacherId);
}

export function hasActiveSchoolFilters(filters: SchoolTimetableFilters) {
  return filters.gradeId !== "all" || filters.majorId !== "all" || Boolean(filters.search.trim());
}
