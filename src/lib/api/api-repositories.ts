import { ApiError, apiRequest } from "@/lib/api/client";
import type {
  ClassAssignmentDto,
  ClassDto,
  CourseDto,
  DeleteCheckDto,
  FastApiPage,
  MajorDto,
  TeacherAvailabilityDto,
  TeacherCourseGroupDto,
  TeacherDto,
  WeeklyDaySlotsDto,
} from "@/lib/api/dtos";
import {
  mapClass,
  mapClassAssignment,
  mapCourse,
  mapCourseCreateInputToDto,
  mapMajor,
  mapPage,
  mapTeacher,
  mapWeeklyDaySlots,
  toApiId,
} from "@/lib/api/mappers";
import {
  ClassAssignmentReconciler,
  type ClassAssignmentCreateOperation,
  type ClassAssignmentUpdateOperation,
} from "@/lib/api/class-assignment-reconciliation";
import {
  classAssignmentPath,
  classAssignmentsPath,
  mapAssignmentCreatePayload,
  mapAssignmentUpdatePayload,
} from "@/lib/api/class-assignment-requests";
import type {
  ClassAssignmentCreateInput,
  ClassAssignmentRepository,
  ClassAssignmentReplacementInput,
  ClassAssignmentUpdateInput,
  ClassCreateInput,
  ClassRepository,
  ClassUpdateInput,
  CourseCreateInput,
  CourseRepository,
  CourseUpdateInput,
  DaySlotRepository,
  MajorRepository,
  PaginatedResult,
  RepositoryListParams,
  RepositoryRequestOptions,
  TeacherAvailabilityRepository,
  TeacherCoursesRepository,
  TeacherCreateInput,
  TeacherRepository,
  TeacherUpdateInput,
} from "@/lib/repositories";
import type { Class, ClassAssignment, Course, DaySlotGroup, Major, Teacher } from "@/lib/types";

export class BackendCapabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendCapabilityError";
  }
}

type SchoolIdProvider = () => string | null;

function requireSchoolId(getSchoolId: SchoolIdProvider) {
  const schoolId = getSchoolId();
  if (!schoolId) throw new Error("No active school is selected.");
  return toApiId(schoolId, "schoolId");
}

const withSignal = (options?: RepositoryRequestOptions): RequestInit => ({
  signal: options?.signal,
});

function pageQuery(params: RepositoryListParams = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    size: String(Math.min(100, params.pageSize ?? 100)),
  });
  if (params.search) query.set("search", params.search);
  return query;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export class ApiTeacherRepository implements TeacherRepository {
  private readonly getSchoolId: SchoolIdProvider;
  constructor(getSchoolId: SchoolIdProvider) {
    this.getSchoolId = getSchoolId;
  }

  async list(params: RepositoryListParams = {}): Promise<PaginatedResult<Teacher>> {
    const schoolId = requireSchoolId(this.getSchoolId);
    const active = params.filters?.active;
    const fetchPage = async (activeValue: boolean) => {
      const query = pageQuery(params);
      query.set("active", String(activeValue));
      const classId = asOptionalString(params.filters?.classId);
      if (classId) query.set("class_id", String(toApiId(classId, "classId")));
      const grade = params.filters?.grade;
      if (typeof grade === "number" || typeof grade === "string") query.set("grade", String(grade));
      return apiRequest<FastApiPage<TeacherDto>>(
        `/schools/${schoolId}/teachers?${query}`,
        withSignal(params),
      );
    };
    if (typeof active === "boolean") return mapPage(await fetchPage(active), mapTeacher);
    const [activePage, inactivePage] = await Promise.all([fetchPage(true), fetchPage(false)]);
    const items = [...activePage.items, ...inactivePage.items].map(mapTeacher);
    return {
      items,
      total: activePage.total + inactivePage.total,
      page: 1,
      pageSize: Math.max(1, items.length),
    };
  }

  async getById(id: string, options?: RepositoryRequestOptions): Promise<Teacher | null> {
    const schoolId = requireSchoolId(this.getSchoolId);
    try {
      return mapTeacher(
        await apiRequest<TeacherDto>(
          `/schools/${schoolId}/teachers/${toApiId(id, "teacherId")}`,
          withSignal(options),
        ),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async create(input: TeacherCreateInput, options?: RepositoryRequestOptions): Promise<Teacher> {
    const schoolId = requireSchoolId(this.getSchoolId);
    const dto = await apiRequest<TeacherDto>(`/schools/${schoolId}/teachers`, {
      ...withSignal(options),
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        code: input.personnel_code || null,
        phone: input.phone || null,
      }),
    });
    return mapTeacher(dto);
  }

  async update(
    id: string,
    input: TeacherUpdateInput,
    options?: RepositoryRequestOptions,
  ): Promise<Teacher> {
    const schoolId = requireSchoolId(this.getSchoolId);
    const payload: Record<string, string | null> = {};
    if (input.name !== undefined) payload.name = input.name;
    if (input.personnel_code !== undefined) payload.code = input.personnel_code || null;
    if (input.phone !== undefined) payload.phone = input.phone || null;
    const dto = await apiRequest<TeacherDto>(
      `/schools/${schoolId}/teachers/${toApiId(id, "teacherId")}`,
      {
        ...withSignal(options),
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    return mapTeacher(dto);
  }

  async delete(id: string, options?: RepositoryRequestOptions): Promise<void> {
    const schoolId = requireSchoolId(this.getSchoolId);
    await apiRequest<TeacherDto>(`/schools/${schoolId}/teachers/${toApiId(id, "teacherId")}`, {
      ...withSignal(options),
      method: "DELETE",
    });
  }
}

export class ApiTeacherAvailabilityRepository implements TeacherAvailabilityRepository {
  private readonly getSchoolId: SchoolIdProvider;
  constructor(getSchoolId: SchoolIdProvider) {
    this.getSchoolId = getSchoolId;
  }

  async list(teacherId: string, options?: RepositoryRequestOptions): Promise<string[]> {
    const schoolId = requireSchoolId(this.getSchoolId);
    const rows = await apiRequest<TeacherAvailabilityDto[]>(
      `/schools/${schoolId}/teachers/${toApiId(teacherId, "teacherId")}/availability`,
      withSignal(options),
    );
    return rows.map((row) => String(row.day_slot_id));
  }

  async replace(
    teacherId: string,
    daySlotIds: readonly string[],
    options?: RepositoryRequestOptions,
  ): Promise<string[]> {
    const schoolId = requireSchoolId(this.getSchoolId);
    const rows = await apiRequest<TeacherAvailabilityDto[]>(
      `/schools/${schoolId}/teachers/${toApiId(teacherId, "teacherId")}/availability`,
      {
        ...withSignal(options),
        method: "PUT",
        body: JSON.stringify({
          day_slot_ids: daySlotIds.map((id) => toApiId(id, "daySlotId")),
        }),
      },
    );
    return rows.map((row) => String(row.day_slot_id));
  }
}

export class ApiTeacherCoursesRepository implements TeacherCoursesRepository {
  private readonly getSchoolId: SchoolIdProvider;
  constructor(getSchoolId: SchoolIdProvider) {
    this.getSchoolId = getSchoolId;
  }

  async list(teacherId: string, options?: RepositoryRequestOptions): Promise<Course[]> {
    const schoolId = requireSchoolId(this.getSchoolId);
    const groups = await apiRequest<TeacherCourseGroupDto[]>(
      `/schools/${schoolId}/teachers/${toApiId(teacherId, "teacherId")}/courses`,
      withSignal(options),
    );
    const unique = new Map<number, CourseDto>();
    groups.forEach((group) => group.courses.forEach((course) => unique.set(course.id, course)));
    return [...unique.values()].map(mapCourse);
  }
}

export class ApiDaySlotRepository implements DaySlotRepository {
  private readonly getSchoolId: SchoolIdProvider;
  constructor(getSchoolId: SchoolIdProvider) {
    this.getSchoolId = getSchoolId;
  }

  async listWeek(options?: RepositoryRequestOptions): Promise<DaySlotGroup[]> {
    const schoolId = requireSchoolId(this.getSchoolId);
    const week = await apiRequest<WeeklyDaySlotsDto>(
      `/schools/${schoolId}/day-slots/week`,
      withSignal(options),
    );
    return mapWeeklyDaySlots(week);
  }
}

export class ApiMajorRepository implements MajorRepository {
  async list(options?: RepositoryRequestOptions): Promise<Major[]> {
    const majors = await apiRequest<MajorDto[]>("/majors/", withSignal(options));
    return majors.map(mapMajor);
  }
}

export class ApiCourseRepository implements CourseRepository {
  private readonly getSchoolId: SchoolIdProvider;
  constructor(getSchoolId: SchoolIdProvider) {
    this.getSchoolId = getSchoolId;
  }

  async list(params: RepositoryListParams = {}): Promise<PaginatedResult<Course>> {
    const schoolId = requireSchoolId(this.getSchoolId);
    const classId = asOptionalString(params.filters?.classId);
    const path = classId
      ? `/schools/${schoolId}/classes/${toApiId(classId, "classId")}/courses`
      : `/schools/${schoolId}/courses?active_only=${String(params.filters?.active !== false)}`;
    const items = (await apiRequest<CourseDto[]>(path, withSignal(params))).map(mapCourse);
    return { items, total: items.length, page: 1, pageSize: Math.max(1, items.length) };
  }

  async getById(id: string, options?: RepositoryRequestOptions): Promise<Course | null> {
    const schoolId = requireSchoolId(this.getSchoolId);
    try {
      return mapCourse(
        await apiRequest<CourseDto>(
          `/schools/${schoolId}/courses/${toApiId(id, "courseId")}`,
          withSignal(options),
        ),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async create(input: CourseCreateInput, options?: RepositoryRequestOptions): Promise<Course> {
    const schoolId = requireSchoolId(this.getSchoolId);
    return mapCourse(
      await apiRequest<CourseDto>(`/schools/${schoolId}/courses`, {
        ...withSignal(options),
        method: "POST",
        body: JSON.stringify(mapCourseCreateInputToDto(input)),
      }),
    );
  }

  async update(
    id: string,
    input: CourseUpdateInput,
    options?: RepositoryRequestOptions,
  ): Promise<Course> {
    const schoolId = requireSchoolId(this.getSchoolId);
    const payload: Record<string, string | number> = {};
    if (input.name !== undefined) payload.name = input.name;
    if (input.majorId !== undefined) payload.major_id = toApiId(input.majorId, "majorId");
    if (input.gradeId !== undefined) payload.grade = Number(input.gradeId);
    if (input.category !== undefined) payload.category = input.category;
    return mapCourse(
      await apiRequest<CourseDto>(`/schools/${schoolId}/courses/${toApiId(id, "courseId")}`, {
        ...withSignal(options),
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    );
  }

  async delete(id: string, options?: RepositoryRequestOptions): Promise<void> {
    const schoolId = requireSchoolId(this.getSchoolId);
    const courseId = toApiId(id, "courseId");
    const check = await apiRequest<DeleteCheckDto>(
      `/schools/${schoolId}/courses/${courseId}/delete-check`,
      withSignal(options),
    );
    await apiRequest<CourseDto>(
      `/schools/${schoolId}/courses/${courseId}?confirm=${String(
        check.requires_confirmation ?? false,
      )}`,
      { ...withSignal(options), method: "DELETE" },
    );
  }
}

export class ApiClassRepository implements ClassRepository {
  private readonly getSchoolId: SchoolIdProvider;
  constructor(getSchoolId: SchoolIdProvider) {
    this.getSchoolId = getSchoolId;
  }

  async list(params: RepositoryListParams = {}): Promise<PaginatedResult<Class>> {
    const schoolId = requireSchoolId(this.getSchoolId);
    const page = await apiRequest<FastApiPage<ClassDto>>(
      `/schools/${schoolId}/classes/?${pageQuery(params)}`,
      withSignal(params),
    );
    return mapPage(page, mapClass);
  }

  async getById(id: string, options?: RepositoryRequestOptions): Promise<Class | null> {
    const schoolId = requireSchoolId(this.getSchoolId);
    try {
      return mapClass(
        await apiRequest<ClassDto>(
          `/schools/${schoolId}/classes/${toApiId(id, "classId")}`,
          withSignal(options),
        ),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async create(input: ClassCreateInput, options?: RepositoryRequestOptions): Promise<Class> {
    const schoolId = requireSchoolId(this.getSchoolId);
    return mapClass(
      await apiRequest<ClassDto>(`/schools/${schoolId}/classes/`, {
        ...withSignal(options),
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          grade: Number(input.gradeId),
          major_id: toApiId(input.majorId, "majorId"),
        }),
      }),
    );
  }

  async update(
    id: string,
    input: ClassUpdateInput,
    options?: RepositoryRequestOptions,
  ): Promise<Class> {
    const schoolId = requireSchoolId(this.getSchoolId);
    const payload: Record<string, string | number> = {};
    if (input.name !== undefined) payload.name = input.name;
    if (input.gradeId !== undefined) payload.grade = Number(input.gradeId);
    if (input.majorId !== undefined) payload.major_id = toApiId(input.majorId, "majorId");
    return mapClass(
      await apiRequest<ClassDto>(`/schools/${schoolId}/classes/${toApiId(id, "classId")}`, {
        ...withSignal(options),
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    );
  }

  async delete(id: string, options?: RepositoryRequestOptions): Promise<void> {
    const schoolId = requireSchoolId(this.getSchoolId);
    const classId = toApiId(id, "classId");
    const check = await apiRequest<DeleteCheckDto>(
      `/schools/${schoolId}/classes/${classId}/delete-check`,
      withSignal(options),
    );
    if (check.can_delete === false) {
      throw new ApiError(
        check.message ?? "Class has dependencies and cannot be deleted.",
        409,
        check,
      );
    }
    await apiRequest<ClassDto>(`/schools/${schoolId}/classes/${classId}`, {
      ...withSignal(options),
      method: "DELETE",
    });
  }
}

export class ApiClassAssignmentRepository implements ClassAssignmentRepository {
  private readonly getSchoolId: SchoolIdProvider;
  private readonly reconciler: ClassAssignmentReconciler;

  constructor(getSchoolId: SchoolIdProvider) {
    this.getSchoolId = getSchoolId;
    this.reconciler = new ClassAssignmentReconciler({
      load: (classId, options) => this.loadForClass(classId, options),
      remove: (classId, assignmentId, options) =>
        this.deleteForClass(classId, assignmentId, options),
      update: async (classId, operation, options) => {
        await this.updateForClass(classId, operation, options);
      },
      create: async (classId, operation, options) => {
        await this.createForClass(classId, operation, options);
      },
    });
  }

  async list(params: RepositoryListParams = {}): Promise<PaginatedResult<ClassAssignment>> {
    const classId = asOptionalString(params.filters?.classId);
    const classIds = [...asStringArray(params.filters?.classIds), ...(classId ? [classId] : [])];
    if (classIds.length === 0) {
      throw new Error("Class assignment queries require a classId or classIds filter.");
    }
    const pages = await Promise.all(
      [...new Set(classIds)].map((classId) => this.loadForClass(classId, params)),
    );
    const items = pages.flat();
    return { items, total: items.length, page: 1, pageSize: Math.max(1, items.length) };
  }

  async getById(): Promise<ClassAssignment | null> {
    throw new BackendCapabilityError("The backend has no get-assignment-by-ID endpoint.");
  }

  async create(
    input: ClassAssignmentCreateInput,
    options?: RepositoryRequestOptions,
  ): Promise<ClassAssignment> {
    return this.createForClass(
      input.classId,
      {
        courseId: input.courseId,
        teacherId: input.teacherId,
        weeklyPeriods: input.weeklyPeriods,
      },
      options,
    );
  }

  async update(
    id: string,
    input: ClassAssignmentUpdateInput,
    options?: RepositoryRequestOptions,
  ): Promise<ClassAssignment> {
    if (!input.classId) throw new Error("classId is required to update an assignment.");
    const current = await this.getAssignmentForClass(input.classId, id, options);
    return this.updateForClass(
      input.classId,
      {
        assignmentId: id,
        teacherId: input.teacherId ?? current.teacherId,
        weeklyPeriods: input.weeklyPeriods ?? current.weeklyPeriods,
      },
      options,
    );
  }

  async delete(): Promise<void> {
    throw new BackendCapabilityError(
      "Deleting an assignment requires its classId; use the class-scoped workflow.",
    );
  }

  replaceForClass(
    classId: string,
    assignments: readonly ClassAssignmentReplacementInput[],
    options?: RepositoryRequestOptions,
  ): Promise<ClassAssignment[]> {
    toApiId(classId, "classId");
    const courseIds = new Set<number>();
    assignments.forEach((assignment) => {
      const courseId = toApiId(assignment.courseId, "courseId");
      if (courseIds.has(courseId)) {
        throw new Error("Duplicate courses are not allowed within the same class.");
      }
      courseIds.add(courseId);
      toApiId(assignment.teacherId, "teacherId");
      if (assignment.id) toApiId(assignment.id, "assignmentId");
    });
    return this.reconciler.replaceForClass(classId, assignments, options);
  }

  private async loadForClass(
    classId: string,
    options?: RepositoryRequestOptions,
  ): Promise<ClassAssignment[]> {
    const schoolId = requireSchoolId(this.getSchoolId);
    const rows = await apiRequest<ClassAssignmentDto[]>(
      classAssignmentsPath(schoolId, classId),
      withSignal(options),
    );
    return rows.map(mapClassAssignment);
  }

  private async getAssignmentForClass(
    classId: string,
    assignmentId: string,
    options?: RepositoryRequestOptions,
  ): Promise<ClassAssignment> {
    const assignment = (await this.loadForClass(classId, options)).find(
      (item) => item.id === assignmentId,
    );
    if (!assignment) throw new ApiError("Class assignment was not found.", 404);
    return assignment;
  }

  private async createForClass(
    classId: string,
    input: ClassAssignmentCreateOperation,
    options?: RepositoryRequestOptions,
  ): Promise<ClassAssignment> {
    const schoolId = requireSchoolId(this.getSchoolId);
    return mapClassAssignment(
      await apiRequest<ClassAssignmentDto>(classAssignmentsPath(schoolId, classId), {
        ...withSignal(options),
        method: "POST",
        body: JSON.stringify(mapAssignmentCreatePayload(input)),
      }),
    );
  }

  private async updateForClass(
    classId: string,
    input: ClassAssignmentUpdateOperation,
    options?: RepositoryRequestOptions,
  ): Promise<ClassAssignment> {
    const schoolId = requireSchoolId(this.getSchoolId);
    return mapClassAssignment(
      await apiRequest<ClassAssignmentDto>(
        classAssignmentPath(schoolId, classId, input.assignmentId),
        {
          ...withSignal(options),
          method: "PATCH",
          body: JSON.stringify(mapAssignmentUpdatePayload(input)),
        },
      ),
    );
  }

  private async deleteForClass(
    classId: string,
    assignmentId: string,
    options?: RepositoryRequestOptions,
  ): Promise<void> {
    const schoolId = requireSchoolId(this.getSchoolId);
    await apiRequest<ClassAssignmentDto>(classAssignmentPath(schoolId, classId, assignmentId), {
      ...withSignal(options),
      method: "DELETE",
    });
  }
}
