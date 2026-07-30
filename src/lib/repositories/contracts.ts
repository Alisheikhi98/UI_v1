import type { Class, ClassAssignment, Course, Teacher } from "@/lib/types";

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

export interface EntityRepository<T extends { id: string }> {
  list(params?: RepositoryListParams): Promise<PaginatedResult<T>>;
  getById(id: string, options?: RepositoryRequestOptions): Promise<T | null>;
  create(input: CreateInput<T>, options?: RepositoryRequestOptions): Promise<T>;
  update(id: string, input: UpdateInput<T>, options?: RepositoryRequestOptions): Promise<T>;
  delete(id: string, options?: RepositoryRequestOptions): Promise<void>;
}

export type TeacherCreateInput = CreateInput<Teacher>;
export type TeacherUpdateInput = UpdateInput<Teacher>;
// Named domain contracts intentionally specialize the reusable CRUD contract.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TeacherRepository extends EntityRepository<Teacher> {}

export type CourseCreateInput = CreateInput<Course>;
export type CourseUpdateInput = UpdateInput<Course>;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CourseRepository extends EntityRepository<Course> {}

export type ClassCreateInput = CreateInput<Class>;
export type ClassUpdateInput = UpdateInput<Class>;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ClassRepository extends EntityRepository<Class> {}

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
