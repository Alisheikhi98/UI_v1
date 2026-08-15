import type { Class, ClassAssignment, Course, DaySlotGroup, Major, Teacher } from "@/lib/types";

export interface RepositoryRequestOptions {
  signal?: AbortSignal;
}

export interface RepositorySort {
  field: string;
  direction: "asc" | "desc";
}

export interface RepositoryListParams extends RepositoryRequestOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  filters?: Record<string, string | number | boolean | readonly string[] | undefined>;
  sort?: readonly RepositorySort[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type CreateInput<T extends { id: string }> = Omit<T, "id">;
export type UpdateInput<T extends { id: string }> = Partial<Omit<T, "id">>;

export interface EntityRepository<
  T extends { id: string },
  TCreate = CreateInput<T>,
  TUpdate = UpdateInput<T>,
> {
  list(params?: RepositoryListParams): Promise<PaginatedResult<T>>;
  getById(id: string, options?: RepositoryRequestOptions): Promise<T | null>;
  create(input: TCreate, options?: RepositoryRequestOptions): Promise<T>;
  update(id: string, input: TUpdate, options?: RepositoryRequestOptions): Promise<T>;
  delete(id: string, options?: RepositoryRequestOptions): Promise<void>;
}

export interface TeacherCreateInput {
  name: string;
  personnel_code?: string;
  phone?: string;
}
export type TeacherUpdateInput = Partial<TeacherCreateInput>;
// Named domain contracts intentionally specialize the reusable CRUD contract.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TeacherRepository extends EntityRepository<
  Teacher,
  TeacherCreateInput,
  TeacherUpdateInput
> {}

export interface CourseCreateInput {
  name: string;
  gradeId: string;
  majorId: string;
  category: Course["category"];
  active?: boolean;
}
export type CourseUpdateInput = Partial<Omit<CourseCreateInput, "active">>;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CourseRepository extends EntityRepository<
  Course,
  CourseCreateInput,
  CourseUpdateInput
> {}

export interface ClassCreateInput {
  name: string;
  gradeId: string;
  majorId: string;
}
export type ClassUpdateInput = Partial<ClassCreateInput>;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ClassRepository extends EntityRepository<
  Class,
  ClassCreateInput,
  ClassUpdateInput
> {}

export type ClassAssignmentCreateInput = CreateInput<ClassAssignment>;
export type ClassAssignmentUpdateInput = UpdateInput<ClassAssignment>;
export type ClassAssignmentReplacementInput = Omit<ClassAssignment, "id"> & {
  id?: string;
};

export interface ClassAssignmentRepository extends EntityRepository<ClassAssignment> {
  replaceForClass(
    classId: string,
    assignments: readonly ClassAssignmentReplacementInput[],
    options?: RepositoryRequestOptions,
  ): Promise<ClassAssignment[]>;
}

export interface DaySlotRepository {
  listWeek(options?: RepositoryRequestOptions): Promise<DaySlotGroup[]>;
}

export interface TeacherAvailabilityRepository {
  list(teacherId: string, options?: RepositoryRequestOptions): Promise<string[]>;
  replace(
    teacherId: string,
    daySlotIds: readonly string[],
    options?: RepositoryRequestOptions,
  ): Promise<string[]>;
}

export interface TeacherCoursesRepository {
  list(teacherId: string, options?: RepositoryRequestOptions): Promise<string[]>;
}

export interface MajorRepository {
  list(options?: RepositoryRequestOptions): Promise<Major[]>;
}
