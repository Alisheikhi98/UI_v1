import { courseRepository, teacherRepository } from "@/lib/mock-repositories";
import type {
  DaySlotRepository,
  RepositoryRequestOptions,
  TeacherAvailabilityRepository,
  TeacherCoursesRepository,
} from "@/lib/repositories";
import type { Course, DaySlot } from "@/lib/types";

export const mockDaySlots: DaySlot[] = Array.from({ length: 6 }, (_, index) => ({
  id: `mock-slot-${index + 1}`,
  schoolId: "1",
  dayId: index + 1,
  slotNumber: 1,
  title: null,
  startTime: "08:00",
  endTime: "09:00",
  active: true,
}));

export class MockDaySlotRepository implements DaySlotRepository {
  list(): Promise<DaySlot[]> {
    return Promise.resolve(structuredClone(mockDaySlots));
  }
}

export class MockTeacherAvailabilityRepository implements TeacherAvailabilityRepository {
  async list(teacherId: string): Promise<string[]> {
    return (await teacherRepository.getById(teacherId))?.availableDaySlotIds ?? [];
  }

  async replace(
    teacherId: string,
    daySlotIds: readonly string[],
    options?: RepositoryRequestOptions,
  ): Promise<string[]> {
    await teacherRepository.setAvailability(teacherId, [...daySlotIds], options);
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
