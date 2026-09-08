import { resolveGradeName, resolveMajorName } from "@/lib/class-management-selectors";
import type { PublishedClassSchedule, ScheduleCandidateDetail } from "@/lib/scheduler";
import type { ScheduleAssignmentCourseReference } from "@/lib/repositories";
import type { Class, DaySlotGroup, Major, Teacher } from "@/lib/types";
import { getWeekdayDisplayLabel } from "@/lib/weekday-labels";

export type TimetableViewMode = "school" | "class" | "teacher";

export interface TimetableRouteSearch {
  mode?: TimetableViewMode;
  classId?: string;
  teacherId?: string;
}

export function parseTimetableRouteSearch(search: Record<string, unknown>): TimetableRouteSearch {
  const mode =
    search.mode === "school" || search.mode === "class" || search.mode === "teacher"
      ? search.mode
      : undefined;
  const classId =
    typeof search.classId === "string" ? search.classId.trim() || undefined : undefined;
  const teacherId =
    typeof search.teacherId === "string" ? search.teacherId.trim() || undefined : undefined;

  return { mode, classId, teacherId };
}

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

function historicalDayKey(dayName: string) {
  return `historical-day-${dayName
    .trim()
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^a-z0-9]+/g, "-")}`;
}

export function normalizeCandidateTimetable({
  candidate,
  schoolName,
  classes,
  teachers,
  assignmentCourseReferences,
  daySlotGroups,
}: {
  candidate: Pick<ScheduleCandidateDetail, "id" | "lessons">;
  schoolName: string;
  classes: readonly Class[];
  teachers: readonly Teacher[];
  assignmentCourseReferences: readonly ScheduleAssignmentCourseReference[];
  daySlotGroups: readonly DaySlotGroup[];
}): NormalizedTimetable {
  const classIds = new Set(candidate.lessons.map((lesson) => lesson.classId));
  const teacherIds = new Set(candidate.lessons.map((lesson) => lesson.teacherId));
  const classesById = new Map(classes.map((item) => [item.id, item]));
  const teachersById = new Map(teachers.map((item) => [item.id, item]));
  const courseReferences = new Map(
    assignmentCourseReferences.map((reference) => [reference.assignmentId, reference]),
  );
  const slotsById = new Map(
    daySlotGroups.flatMap((group) =>
      group.slots.map((slot) => [slot.id, { group, slot }] as const),
    ),
  );
  const activeDaySlotGroups = daySlotGroups
    .map((group) => ({ ...group, slots: group.slots.filter((slot) => slot.active) }))
    .filter((group) => group.slots.length > 0);
  const daysByName = new Map<string, TimetableDay>();
  const dayOrder: string[] = [];

  activeDaySlotGroups.forEach((group) => {
    const key = group.dayName.trim().toLocaleLowerCase("en-US");
    if (daysByName.has(key)) return;
    daysByName.set(key, {
      id: String(group.dayId),
      backendName: group.dayName,
      label: getWeekdayDisplayLabel(group.dayName),
    });
    dayOrder.push(key);
  });

  candidate.lessons.forEach((lesson) => {
    const slot = slotsById.get(lesson.daySlotId);
    const backendName = slot?.group.dayName ?? lesson.day;
    const key = backendName.trim().toLocaleLowerCase("en-US");
    if (daysByName.has(key)) return;
    daysByName.set(key, {
      id: historicalDayKey(backendName),
      backendName,
      label: getWeekdayDisplayLabel(backendName),
    });
    dayOrder.push(key);
  });

  const periodTimes = new Map<number, { startTime: string | null; endTime: string | null }>();
  activeDaySlotGroups.forEach((group) =>
    group.slots.forEach((slot) => {
      if (!periodTimes.has(slot.slotNumber)) {
        periodTimes.set(slot.slotNumber, {
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }),
  );
  const slotNumbers = [
    ...new Set([
      ...activeDaySlotGroups.flatMap((group) => group.slots.map((slot) => slot.slotNumber)),
      ...candidate.lessons.map((lesson) => lesson.slot),
    ]),
  ].sort((left, right) => left - right);

  return {
    id: `candidate-${candidate.id}`,
    schoolName,
    days: dayOrder.map((key) => daysByName.get(key)!),
    periods: slotNumbers.map((slotNumber) => {
      const time = periodTimes.get(slotNumber);
      return {
        id: periodId(slotNumber),
        slotNumber,
        label: `زنگ ${slotNumber.toLocaleString("fa-IR")}`,
        time: time ? displayTime(time.startTime, time.endTime) : "زمان تاریخی در دسترس نیست",
      };
    }),
    classes: [...classIds].map((id) => {
      const item = classesById.get(id);
      return {
        id,
        name: item?.name ?? "کلاس حذف‌شده",
        shortName: item?.name ?? "کلاس حذف‌شده",
        gradeId: item?.gradeId ?? "unknown",
        gradeLabel: "",
        majorId: item?.majorId ?? "unknown",
        majorLabel: "",
      };
    }),
    teachers: [...teacherIds].map((id) => ({
      id,
      name: teachersById.get(id)?.name ?? "معلم حذف‌شده",
    })),
    entries: candidate.lessons.map((lesson, index) => {
      const slot = slotsById.get(lesson.daySlotId);
      const dayName = slot?.group.dayName ?? lesson.day;
      const day = daysByName.get(dayName.trim().toLocaleLowerCase("en-US"));
      const courseReference = courseReferences.get(lesson.assignmentId);
      const courseName =
        courseReference?.courseId === lesson.courseId && courseReference.courseName.trim()
          ? courseReference.courseName
          : "درس حذف‌شده";
      return {
        id: `candidate-${candidate.id}-lesson-${index}`,
        dayId: day?.id ?? historicalDayKey(dayName),
        periodId: periodId(lesson.slot),
        classId: lesson.classId,
        teacherId: lesson.teacherId,
        courseId: lesson.courseId,
        courseName,
      };
    }),
  };
}

// Historical and freshly generated candidates share the same server shape.
// Keep this name for the timetable history feature without coupling Generator exports to history.
export const normalizeHistoricalCandidate = normalizeCandidateTimetable;

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
      shortName: majorLabel ? `${gradeLabel} • ${majorLabel}` : gradeLabel,
      gradeId: item.gradeId,
      gradeLabel,
      majorId: item.majorId ?? "",
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
