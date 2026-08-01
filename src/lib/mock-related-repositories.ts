import { courseRepository, teacherRepository } from "@/lib/mock-repositories";
import type {
  DaySlotRepository,
  RepositoryRequestOptions,
  TeacherAvailabilityRepository,
  TeacherCoursesRepository,
} from "@/lib/repositories";
import type { Course, DaySlotGroup } from "@/lib/types";
import { BACKEND_WEEKDAY_NAMES, getWeekdayDisplayLabel } from "@/lib/weekday-labels";

const mockWeekdayNames = BACKEND_WEEKDAY_NAMES.slice(0, 6).map(getWeekdayDisplayLabel);
const mockDaySlotGroups: DaySlotGroup[] = mockWeekdayNames.map((dayName, dayIndex) => ({
  dayId: dayIndex + 1,
  dayName,
  slots: Array.from({ length: 3 }, (_, slotIndex) => ({
    id: `mock-slot-${dayIndex * 3 + slotIndex + 1}`,
    schoolId: "1",
    dayId: dayIndex + 1,
    slotNumber: slotIndex + 1,
    title: null,
    startTime: `${String(8 + slotIndex).padStart(2, "0")}:00`,
    endTime: `${String(9 + slotIndex).padStart(2, "0")}:00`,
    active: true,
  })),
}));

const mockAvailabilityByTeacher = new Map<string, string[]>([
  ["1", ["mock-slot-1", "mock-slot-2", "mock-slot-3", "mock-slot-5"]],
  ["2", ["mock-slot-1", "mock-slot-3", "mock-slot-4", "mock-slot-6"]],
  ["3", ["mock-slot-2", "mock-slot-3", "mock-slot-5", "mock-slot-6"]],
  ["4", ["mock-slot-1", "mock-slot-4"]],
  ["5", []],
]);

export class MockDaySlotRepository implements DaySlotRepository {
  listWeek(): Promise<DaySlotGroup[]> {
    return Promise.resolve(structuredClone(mockDaySlotGroups));
  }
}

export class MockTeacherAvailabilityRepository implements TeacherAvailabilityRepository {
  async list(teacherId: string): Promise<string[]> {
    return structuredClone(mockAvailabilityByTeacher.get(teacherId) ?? []);
  }

  async replace(
    teacherId: string,
    daySlotIds: readonly string[],
    options?: RepositoryRequestOptions,
  ): Promise<string[]> {
    if (!(await teacherRepository.getById(teacherId, options))) {
      throw new Error("Teacher not found.");
    }
    mockAvailabilityByTeacher.set(teacherId, [...daySlotIds]);
    return [...daySlotIds];
  }
}

export class MockTeacherCoursesRepository implements TeacherCoursesRepository {
  async list(teacherId: string): Promise<Course[]> {
    const teacher = await teacherRepository.getById(teacherId);
    if (!teacher) return [];
    const courses = await courseRepository.list();
    return courses.items.filter((course) => teacher.courseIds.includes(course.id));
  }
}
