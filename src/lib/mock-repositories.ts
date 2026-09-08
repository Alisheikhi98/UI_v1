import type { Class, ClassAssignment, Course, Teacher } from "@/lib/types";
import type {
  ClassAssignmentReplacementInput,
  ClassAssignmentRepository,
  ClassCreateInput,
  ClassRepository,
  ClassUpdateInput,
  CourseCreateInput,
  CourseRepository,
  CourseUpdateInput,
  CreateInput,
  EntityRepository,
  PaginatedResult,
  RepositoryListParams,
  RepositoryRequestOptions,
  TeacherRepository,
  TeacherCreateInput,
  TeacherUpdateInput,
  UpdateInput,
} from "@/lib/repositories";

const clone = <T>(value: T): T => structuredClone(value);

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("The operation was aborted.", "AbortError");
}

function matchesFilters<T extends { id: string }>(
  record: T,
  filters: RepositoryListParams["filters"],
) {
  if (!filters) return true;
  return Object.entries(filters).every(([field, expected]) => {
    if (expected === undefined) return true;
    const actual = (record as Record<string, unknown>)[field];
    return Array.isArray(expected) ? expected.includes(String(actual)) : actual === expected;
  });
}

export class MockEntityRepository<T extends { id: string }> implements EntityRepository<T> {
  private records: T[];
  private revision = 0;

  constructor(seed: T[]) {
    this.records = clone(seed);
  }

  list(params: RepositoryListParams = {}): Promise<PaginatedResult<T>> {
    throwIfAborted(params.signal);
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, params.pageSize ?? Math.max(1, this.records.length));
    const search = params.search?.trim().toLocaleLowerCase();
    let records = this.records.filter(
      (record) =>
        matchesFilters(record, params.filters) &&
        (!search || JSON.stringify(record).toLocaleLowerCase().includes(search)),
    );

    for (const sort of [...(params.sort ?? [])].reverse()) {
      records = [...records].sort((first, second) => {
        const left = String((first as Record<string, unknown>)[sort.field] ?? "");
        const right = String((second as Record<string, unknown>)[sort.field] ?? "");
        const comparison = left.localeCompare(right, undefined, { numeric: true });
        return sort.direction === "asc" ? comparison : -comparison;
      });
    }

    const total = records.length;
    const start = (page - 1) * pageSize;
    return Promise.resolve({
      items: clone(records.slice(start, start + pageSize)),
      total,
      page,
      pageSize,
    });
  }

  snapshot(): T[] {
    return clone(this.records);
  }

  getById(id: string, options?: RepositoryRequestOptions): Promise<T | null> {
    throwIfAborted(options?.signal);
    return Promise.resolve(clone(this.records.find((item) => item.id === id) ?? null));
  }

  create(input: CreateInput<T>, options?: RepositoryRequestOptions): Promise<T> {
    throwIfAborted(options?.signal);
    const record = { ...clone(input), id: crypto.randomUUID() } as T;
    this.replaceRecords([...this.records, clone(record)]);
    return Promise.resolve(clone(record));
  }

  update(id: string, input: UpdateInput<T>, options?: RepositoryRequestOptions): Promise<T> {
    throwIfAborted(options?.signal);
    const index = this.records.findIndex((item) => item.id === id);
    if (index === -1) return Promise.reject(new Error(`Entity with id "${id}" was not found.`));
    const record = { ...this.records[index], ...clone(input), id } as T;
    this.replaceRecords(this.records.map((item) => (item.id === id ? record : item)));
    return Promise.resolve(clone(record));
  }

  delete(id: string, options?: RepositoryRequestOptions): Promise<void> {
    throwIfAborted(options?.signal);
    this.replaceRecords(this.records.filter((item) => item.id !== id));
    return Promise.resolve();
  }

  getRevision(): number {
    return this.revision;
  }

  protected replaceRecords(records: T[]) {
    this.records = clone(records);
    this.revision += 1;
  }
}

const initialAssignments: ClassAssignment[] = [
  { id: "assignment-1", classId: "1", courseId: "1", teacherId: "1", weeklyPeriods: 6 },
  { id: "assignment-2", classId: "1", courseId: "3", teacherId: "3", weeklyPeriods: 4 },
  { id: "assignment-3", classId: "2", courseId: "2", teacherId: "2", weeklyPeriods: 5 },
];

const initialTeachers: Teacher[] = [
  {
    id: "1",
    name: "سارا احمدی",
    email: "sara.ahmadi@school.edu",
    phone: "۰۲۱-۱۲۳۴۵۶۷",
    personnel_code: "1",
    courseIds: ["1", "3"],
    status: "active",
  },
  {
    id: "2",
    name: "محمد رضایی",
    email: "mohammad.rezaei@school.edu",
    phone: "۰۲۱-۲۳۴۵۶۷۸",
    personnel_code: "2",
    courseIds: ["2"],
    status: "active",
  },
  {
    id: "3",
    name: "الناز حسینی",
    email: "elnaz.hosseini@school.edu",
    phone: "۰۲۱-۳۴۵۶۷۸۹",
    personnel_code: "3",
    courseIds: ["4", "5"],
    status: "active",
  },
  {
    id: "4",
    name: "داوود کریمی",
    email: "davood.karimi@school.edu",
    phone: "۰۲۱-۴۵۶۷۸۹۰",
    personnel_code: "4",
    courseIds: ["6", "7"],
    status: "inactive",
  },
  {
    id: "5",
    name: "نسیم محمدی",
    email: "nasim.mohammadi@school.edu",
    phone: "۰۲۱-۵۶۷۸۹۰۱",
    personnel_code: "5",
    courseIds: ["8"],
    status: "active",
  },
];

const initialClasses: Class[] = [
  {
    id: "1",
    name: "کلاس ۱۰-الف",
    gradeId: "10",
    majorId: "major-1",
    section: "الف",
    studentCapacity: 32,
    advisorTeacherId: "1",
  },
  {
    id: "2",
    name: "کلاس ۱۰-ب",
    gradeId: "10",
    majorId: "major-2",
    section: "ب",
    studentCapacity: 30,
    advisorTeacherId: "2",
  },
  {
    id: "3",
    name: "کلاس ۱۱-الف",
    gradeId: "11",
    majorId: "major-3",
    section: "الف",
    studentCapacity: 28,
    advisorTeacherId: "3",
  },
  {
    id: "4",
    name: "کلاس ۱۱-ب",
    gradeId: "11",
    majorId: "major-1",
    section: "ب",
    studentCapacity: 31,
    advisorTeacherId: "4",
  },
  {
    id: "5",
    name: "کلاس ۱۲-الف",
    gradeId: "12",
    majorId: "major-2",
    section: "الف",
    studentCapacity: 29,
    advisorTeacherId: "5",
  },
  {
    id: "6",
    name: "کلاس ۱۲-ب",
    gradeId: "12",
    majorId: "major-3",
    section: "ب",
    studentCapacity: 27,
    advisorTeacherId: "1",
  },
];

const initialCourses: Course[] = [
  {
    id: "1",
    name: "ریاضی",
    active: true,
    gradeId: "10",
    majorId: "major-1",
    category: "general",
    code: "MATH",
    weeklyHours: 6,
    assignedTeacherId: "1",
    color: "#1E40AF",
  },
  {
    id: "2",
    name: "زبان انگلیسی",
    active: true,
    gradeId: "11",
    majorId: "major-2",
    category: "general",
    code: "ENG",
    weeklyHours: 5,
    assignedTeacherId: "2",
    color: "#059669",
  },
  {
    id: "3",
    name: "فیزیک",
    active: true,
    gradeId: "12",
    majorId: "major-3",
    category: "specialized",
    code: "PHY",
    weeklyHours: 4,
    assignedTeacherId: "1",
    color: "#7C3AED",
  },
  {
    id: "4",
    name: "شیمی",
    active: true,
    gradeId: "10",
    majorId: "major-1",
    category: "specialized",
    code: "CHEM",
    weeklyHours: 4,
    assignedTeacherId: "3",
    color: "#DC2626",
  },
  {
    id: "5",
    name: "زیست‌شناسی",
    active: true,
    gradeId: "11",
    majorId: "major-2",
    category: "specialized",
    code: "BIO",
    weeklyHours: 3,
    assignedTeacherId: "3",
    color: "#16A34A",
  },
  {
    id: "6",
    name: "تاریخ",
    active: true,
    gradeId: "12",
    majorId: "major-3",
    category: "specialized",
    code: "HIST",
    weeklyHours: 3,
    assignedTeacherId: "4",
    color: "#CA8A04",
  },
  {
    id: "7",
    name: "جغرافیا",
    active: true,
    gradeId: "10",
    majorId: "major-1",
    category: "specialized",
    code: "GEO",
    weeklyHours: 2,
    assignedTeacherId: "4",
    color: "#0891B2",
  },
  {
    id: "8",
    name: "هنر",
    active: true,
    gradeId: "11",
    majorId: "major-2",
    category: "specialized",
    code: "ART",
    weeklyHours: 2,
    assignedTeacherId: "5",
    color: "#DB2777",
  },
];

export class MockTeacherRepository
  extends MockEntityRepository<Teacher>
  implements TeacherRepository
{
  list(params: RepositoryListParams = {}) {
    const active = params.filters?.active;
    const { active: _active, ...filters } = params.filters ?? {};
    return super.list({
      ...params,
      filters: {
        ...filters,
        status: active === true ? "active" : active === false ? "inactive" : undefined,
      },
    });
  }

  create(input: TeacherCreateInput, options?: RepositoryRequestOptions) {
    return super.create(
      {
        name: input.name,
        personnel_code: input.personnel_code ?? "",
        phone: input.phone ?? "",
        email: "",
        courseIds: [],
        status: "active",
      },
      options,
    );
  }

  update(id: string, input: TeacherUpdateInput, options?: RepositoryRequestOptions) {
    return super.update(id, input, options);
  }
}
export class MockCourseRepository extends MockEntityRepository<Course> implements CourseRepository {
  private readonly classes: Pick<ClassRepository, "getById">;

  constructor(seed: Course[], classes: Pick<ClassRepository, "getById">) {
    super(seed);
    this.classes = classes;
  }

  async list(params: RepositoryListParams = {}): Promise<PaginatedResult<Course>> {
    const classId =
      typeof params.filters?.classId === "string" ? params.filters.classId : undefined;
    if (!classId) return super.list(params);

    const selectedClass = await this.classes.getById(classId, { signal: params.signal });
    if (!selectedClass) {
      return {
        items: [],
        total: 0,
        page: Math.max(1, params.page ?? 1),
        pageSize: Math.max(1, params.pageSize ?? 1),
      };
    }

    const { classId: _classId, ...filters } = params.filters ?? {};
    return super.list({
      ...params,
      filters: {
        ...filters,
        gradeId: selectedClass.gradeId,
        majorId: selectedClass.majorId,
        active: true,
      },
    });
  }

  create(input: CourseCreateInput, options?: RepositoryRequestOptions) {
    return super.create(
      {
        ...input,
        active: input.active ?? true,
        code: "",
        weeklyHours: 1,
        color: "#1E40AF",
      },
      options,
    );
  }

  update(id: string, input: CourseUpdateInput, options?: RepositoryRequestOptions) {
    return super.update(id, input, options);
  }
}
export class MockClassRepository extends MockEntityRepository<Class> implements ClassRepository {
  create(input: ClassCreateInput, options?: RepositoryRequestOptions) {
    return super.create({ ...input, studentCapacity: 0 }, options);
  }

  update(id: string, input: ClassUpdateInput, options?: RepositoryRequestOptions) {
    return super.update(id, input, options);
  }
}

export const teacherRepository = new MockTeacherRepository(initialTeachers);
export const classRepository = new MockClassRepository(initialClasses);
export const courseRepository = new MockCourseRepository(initialCourses, classRepository);

export class MockClassAssignmentRepository
  extends MockEntityRepository<ClassAssignment>
  implements ClassAssignmentRepository
{
  private readonly references: {
    classes: ClassRepository;
    courses: CourseRepository;
    teachers: TeacherRepository;
  };

  constructor(
    seed: ClassAssignment[],
    references: {
      classes: ClassRepository;
      courses: CourseRepository;
      teachers: TeacherRepository;
    },
  ) {
    super(seed);
    this.references = references;
  }

  async listScheduleSnapshot(params: RepositoryListParams) {
    const [assignments, courses] = await Promise.all([
      this.list(params),
      this.references.courses.list({ signal: params.signal }),
    ]);
    const courseNames = new Map(courses.items.map((course) => [course.id, course.name]));
    return {
      ...assignments,
      courseReferences: assignments.items.map((assignment) => ({
        assignmentId: assignment.id,
        courseId: assignment.courseId,
        courseName: courseNames.get(assignment.courseId) ?? "",
      })),
    };
  }

  async replaceForClass(
    classId: string,
    assignments: readonly ClassAssignmentReplacementInput[],
    options?: RepositoryRequestOptions,
  ): Promise<ClassAssignment[]> {
    throwIfAborted(options?.signal);
    const [{ items: classes }, { items: courses }, { items: teachers }] = await Promise.all([
      this.references.classes.list({ signal: options?.signal }),
      this.references.courses.list({ signal: options?.signal }),
      this.references.teachers.list({ signal: options?.signal }),
    ]);
    const current = this.snapshot();

    if (!classes.some((schoolClass) => schoolClass.id === classId)) {
      throw new Error("Class not found.");
    }
    if (assignments.some((assignment) => assignment.classId !== classId)) {
      throw new Error("Every assignment must belong to the selected class.");
    }
    const suppliedIds = assignments.flatMap((assignment) => (assignment.id ? [assignment.id] : []));
    if (new Set(suppliedIds).size !== suppliedIds.length) {
      throw new Error("Duplicate assignment IDs are not allowed.");
    }
    if (new Set(assignments.map((assignment) => assignment.courseId)).size !== assignments.length) {
      throw new Error("Duplicate course assignments are not allowed.");
    }
    const courseIds = new Set(courses.map((course) => course.id));
    const teacherIds = new Set(teachers.map((teacher) => teacher.id));
    if (assignments.some((assignment) => !courseIds.has(assignment.courseId))) {
      throw new Error("Invalid course ID.");
    }
    if (assignments.some((assignment) => !teacherIds.has(assignment.teacherId))) {
      throw new Error("Invalid teacher ID.");
    }
    if (
      assignments.some(
        (assignment) =>
          !Number.isInteger(assignment.weeklyPeriods) || assignment.weeklyPeriods <= 0,
      )
    ) {
      throw new Error("Weekly periods must be a positive integer.");
    }

    const IDsOwnedByOtherClasses = new Set(
      current
        .filter((assignment) => assignment.classId !== classId)
        .map((assignment) => assignment.id),
    );
    if (
      assignments.some((assignment) => assignment.id && IDsOwnedByOtherClasses.has(assignment.id))
    ) {
      throw new Error("Assignment ID already belongs to another class.");
    }

    const normalizedAssignments = assignments.map((assignment) => ({
      ...clone(assignment),
      id: assignment.id ?? crypto.randomUUID(),
    }));
    const next = [
      ...current.filter((assignment) => assignment.classId !== classId),
      ...normalizedAssignments,
    ];
    this.replaceRecords(next);
    return clone(normalizedAssignments);
  }
}

export const classAssignmentRepository = new MockClassAssignmentRepository(initialAssignments, {
  classes: classRepository,
  courses: courseRepository,
  teachers: teacherRepository,
});
