import {
  classAssignmentRepository as mockClassAssignmentRepository,
  classRepository as mockClassRepository,
  courseRepository as mockCourseRepository,
  teacherRepository as mockTeacherRepository,
} from "@/lib/mock-repositories";
import type {
  ClassAssignmentRepository,
  ClassRepository,
  CourseRepository,
  PaginatedResult,
  TeacherRepository,
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
export const repositories: RepositoryRegistry = {
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
};
