import {
  classAssignmentRepository as mockClassAssignmentRepository,
  classRepository as mockClassRepository,
  courseRepository as mockCourseRepository,
  teacherRepository as mockTeacherRepository,
} from "@/lib/mock-repositories";
import {
  MockDaySlotRepository,
  MockTeacherAvailabilityRepository,
  MockTeacherCoursesRepository,
} from "@/lib/mock-related-repositories";
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

const createMockRepositories = (): RepositoryRegistry => ({
  teachers: {
    repository: mockTeacherRepository,
    initialData: initialResult(mockTeacherRepository.snapshot()),
  },
  courses: {
    repository: mockCourseRepository,
    initialData: initialResult(mockCourseRepository.snapshot()),
  },
  classes: {
    repository: mockClassRepository,
    initialData: initialResult(mockClassRepository.snapshot()),
  },
  classAssignments: {
    repository: mockClassAssignmentRepository,
    initialData: initialResult(mockClassAssignmentRepository.snapshot()),
  },
  daySlots: new MockDaySlotRepository(),
  teacherAvailability: new MockTeacherAvailabilityRepository(),
  teacherCourses: new MockTeacherCoursesRepository(),
});

const apiRepositories: RepositoryRegistry = {
  teachers: { repository: new ApiTeacherRepository(getActiveSchoolId) },
  courses: { repository: new ApiCourseRepository(getActiveSchoolId) },
  classes: { repository: new ApiClassRepository(getActiveSchoolId) },
  classAssignments: { repository: new ApiClassAssignmentRepository(getActiveSchoolId) },
  daySlots: new ApiDaySlotRepository(getActiveSchoolId),
  teacherAvailability: new ApiTeacherAvailabilityRepository(getActiveSchoolId),
  teacherCourses: new ApiTeacherCoursesRepository(getActiveSchoolId),
};

export const repositories = useMockApi ? createMockRepositories() : apiRepositories;
