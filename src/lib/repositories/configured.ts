import {
  ApiClassAssignmentRepository,
  ApiClassRepository,
  ApiCourseRepository,
  ApiDaySlotRepository,
  ApiTeacherAvailabilityRepository,
  ApiTeacherCoursesRepository,
  ApiTeacherRepository,
} from "@/lib/api/api-repositories";
import { getActiveSchoolId } from "@/lib/active-school";
import type {
  ClassAssignmentRepository,
  ClassRepository,
  CourseRepository,
  PaginatedResult,
  TeacherRepository,
  DaySlotRepository,
  TeacherAvailabilityRepository,
  TeacherCoursesRepository,
} from "@/lib/repositories/contracts";
import type { Class, ClassAssignment, Course, Teacher } from "@/lib/types";

export interface RepositoryBinding<T, TRepository> {
  repository: TRepository;
  initialData?: PaginatedResult<T>;
}

export interface RepositoryRegistry {
  teachers: RepositoryBinding<Teacher, TeacherRepository>;
  courses: RepositoryBinding<Course, CourseRepository>;
  classes: RepositoryBinding<Class, ClassRepository>;
  classAssignments: RepositoryBinding<ClassAssignment, ClassAssignmentRepository>;
  daySlots: DaySlotRepository;
  teacherAvailability: TeacherAvailabilityRepository;
  teacherCourses: TeacherCoursesRepository;
}

const initialResult = <T>(items: T[]): PaginatedResult<T> => ({
  items,
  total: items.length,
  page: 1,
  pageSize: Math.max(1, items.length),
});

// This is the only composition point that knows which persistence
// implementation is active. API repositories can replace these instances
// without changing hooks, routes, or components.
export const useMockApi = import.meta.env.VITE_USE_MOCK_API === "true";

if (import.meta.env.DEV && typeof window !== "undefined") {
  console.info(
    `Repository mode: ${useMockApi ? "MOCK" : "API"}\nAPI base URL: ${import.meta.env.VITE_API_BASE_URL ?? "(not configured)"}`,
  );
}

const createMockRepositories = async (): Promise<RepositoryRegistry> => {
  const [
    { classAssignmentRepository, classRepository, courseRepository, teacherRepository },
    { MockDaySlotRepository, MockTeacherAvailabilityRepository, MockTeacherCoursesRepository },
  ] = await Promise.all([
    import("@/lib/mock-repositories"),
    import("@/lib/mock-related-repositories"),
  ]);

  return {
    teachers: {
      repository: teacherRepository,
      initialData: initialResult(teacherRepository.snapshot()),
    },
    courses: {
      repository: courseRepository,
      initialData: initialResult(courseRepository.snapshot()),
    },
    classes: {
      repository: classRepository,
      initialData: initialResult(classRepository.snapshot()),
    },
    classAssignments: {
      repository: classAssignmentRepository,
      initialData: initialResult(classAssignmentRepository.snapshot()),
    },
    daySlots: new MockDaySlotRepository(),
    teacherAvailability: new MockTeacherAvailabilityRepository(),
    teacherCourses: new MockTeacherCoursesRepository(),
  };
};

const apiRepositories: RepositoryRegistry = {
  teachers: { repository: new ApiTeacherRepository(getActiveSchoolId) },
  courses: { repository: new ApiCourseRepository(getActiveSchoolId) },
  classes: { repository: new ApiClassRepository(getActiveSchoolId) },
  classAssignments: { repository: new ApiClassAssignmentRepository(getActiveSchoolId) },
  daySlots: new ApiDaySlotRepository(getActiveSchoolId),
  teacherAvailability: new ApiTeacherAvailabilityRepository(getActiveSchoolId),
  teacherCourses: new ApiTeacherCoursesRepository(getActiveSchoolId),
};

export const repositories = useMockApi ? await createMockRepositories() : apiRepositories;
