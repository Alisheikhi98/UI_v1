import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  classAssignmentRepository,
  classRepository,
  courseRepository,
  MockTeacherRepository,
  teacherRepository,
} from "../src/lib/mock-repositories.ts";
import { SchoolRepository } from "../src/lib/api/school-repository.ts";
import { MockSchoolPersistenceAdapter } from "../src/lib/api/schools-mock.ts";
import { publishQuerySnapshot } from "../src/lib/query-cache-publication.ts";
import {
  selectClassViewModels,
  selectCoursePickerOptions,
  selectTeacherPickerOptions,
} from "../src/lib/class-management-selectors.ts";
import {
  mapClass,
  mapClassAssignment,
  mapCourse,
  mapDaySlot,
  mapTeacher,
} from "../src/lib/api/mappers.ts";

test("canonical entities preserve IDs, relationships, and stable class metadata", async () => {
  const classes = classRepository.snapshot();
  const courses = courseRepository.snapshot();
  const teachers = teacherRepository.snapshot();
  const assignments = classAssignmentRepository.snapshot();
  const classMajors = new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass.majorId]));

  assert.deepEqual(
    selectClassViewModels([...classes].reverse()).map(({ id, majorId }) => [id, majorId]),
    [...classes].reverse().map(({ id }) => [id, classMajors.get(id)]),
  );

  const teacher = teachers[0];
  const teacherAssignments = assignments.filter(
    (assignment) => assignment.teacherId === teacher.id,
  );
  await teacherRepository.update(teacher.id, { name: `${teacher.name} ویرایش` });
  assert.equal(teacherRepository.snapshot().find(({ id }) => id === teacher.id)?.id, teacher.id);
  assert.deepEqual(
    classAssignmentRepository
      .snapshot()
      .filter((assignment) => assignment.teacherId === teacher.id),
    teacherAssignments,
  );

  const course = courses[0];
  const courseAssignments = assignments.filter((assignment) => assignment.courseId === course.id);
  await courseRepository.update(course.id, { name: `${course.name} ویرایش` });
  assert.equal(courseRepository.snapshot().find(({ id }) => id === course.id)?.id, course.id);
  assert.deepEqual(
    classAssignmentRepository.snapshot().filter((assignment) => assignment.courseId === course.id),
    courseAssignments,
  );

  assert.deepEqual(
    selectCoursePickerOptions(courses).map(({ id }) => id),
    courses.filter(({ active }) => active).map(({ id }) => id),
  );
  assert.deepEqual(
    selectTeacherPickerOptions(teachers).map(({ id }) => id),
    teachers.filter(({ status }) => status === "active").map(({ id }) => id),
  );

  await teacherRepository.update(teacher.id, teacher);
  await courseRepository.update(course.id, course);
});

test("routes do not import private entity seed arrays", async () => {
  const routesDirectory = fileURLToPath(new URL("../src/routes/", import.meta.url));
  const routeFiles = (await readdir(routesDirectory))
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => join(routesDirectory, file));
  const routeSources = await Promise.all(routeFiles.map((file) => readFile(file, "utf8")));

  for (const source of routeSources) {
    assert.doesNotMatch(source, /\bmock(?:Teachers|Subjects|Classes)\b/);
  }
});

test("SchoolRepository is the only owner and localStorage stays inside its adapter", async () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const repository = new SchoolRepository(new MockSchoolPersistenceAdapter(storage));

  const seeded = await repository.getAll();
  assert.equal(seeded.length, 1);
  assert.equal(values.size, 1);

  const created = await repository.create({
    name: "Test School",
    slug: "test-school",
    status: "active",
    workingDays: ["شنبه"],
    timing: { periodsCount: 1, dayStart: "08:00", classDuration: 45, breakDuration: 0 },
    periods: [{ index: 1, start: "08:00", end: "08:45" }],
  });
  assert.equal((await repository.getById(created.id))?.name, "Test School");

  await repository.update(created.id, { ...created, name: "Updated School" });
  assert.equal((await repository.getById(created.id))?.name, "Updated School");
  await repository.delete(created.id);
  assert.equal(await repository.getById(created.id), null);

  const srcDirectory = fileURLToPath(new URL("../src/", import.meta.url));
  const sourceFiles = [];
  const collectFiles = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await collectFiles(path);
      else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(path);
    }
  };
  await collectFiles(srcDirectory);
  for (const file of sourceFiles) {
    if (file.endsWith(join("api", "schools-mock.ts"))) continue;
    assert.doesNotMatch(await readFile(file, "utf8"), /dev_mock_schools/);
  }
});

test("assignment replacement is atomic and preserves IDs across add, update, and delete", async () => {
  const original = classAssignmentRepository.snapshot();
  const classId = "1";
  const current = original.filter((assignment) => assignment.classId === classId);
  const revision = classAssignmentRepository.getRevision();
  const updated = { ...current[0], weeklyPeriods: current[0].weeklyPeriods + 1 };
  const added = {
    id: "assignment-test-added",
    classId,
    courseId: "2",
    teacherId: "2",
    weeklyPeriods: 2,
  };

  await classAssignmentRepository.replaceForClass(classId, [updated, current[1], added]);
  assert.equal(classAssignmentRepository.getRevision(), revision + 1);
  assert.equal(
    classAssignmentRepository.snapshot().find(({ id }) => id === updated.id)?.weeklyPeriods,
    updated.weeklyPeriods,
  );
  assert.equal(
    classAssignmentRepository.snapshot().find(({ id }) => id === added.id)?.id,
    added.id,
  );
  assert.equal(
    classAssignmentRepository.snapshot().find(({ id }) => id === current[1].id)?.id,
    current[1].id,
  );

  const deleteRevision = classAssignmentRepository.getRevision();
  await classAssignmentRepository.replaceForClass(classId, [updated]);
  assert.equal(classAssignmentRepository.getRevision(), deleteRevision + 1);
  assert.equal(
    classAssignmentRepository.snapshot().some(({ id }) => id === current[1].id),
    false,
  );
  assert.equal(
    classAssignmentRepository.snapshot().some(({ id }) => id === added.id),
    false,
  );

  await classAssignmentRepository.replaceForClass(classId, current);
});

test("invalid assignment transactions and cancelled drafts never mutate repository state", async () => {
  const before = classAssignmentRepository.snapshot();
  const classAssignments = structuredClone(
    before.filter((assignment) => assignment.classId === "1"),
  );
  const draft = structuredClone(classAssignments);
  draft[0].weeklyPeriods += 1;
  assert.deepEqual(classAssignmentRepository.snapshot(), before);

  await assert.rejects(
    classAssignmentRepository.replaceForClass("missing-class", []),
    /Class not found/,
  );
  await assert.rejects(
    classAssignmentRepository.replaceForClass("1", [
      { ...classAssignments[0], courseId: "missing-course" },
    ]),
    /Invalid course ID/,
  );
  await assert.rejects(
    classAssignmentRepository.replaceForClass("1", [
      { ...classAssignments[0], teacherId: "missing-teacher" },
    ]),
    /Invalid teacher ID/,
  );
  const sameTeacherAssignments = [
    classAssignments[0],
    { ...classAssignments[1], teacherId: classAssignments[0].teacherId },
  ];
  await classAssignmentRepository.replaceForClass("1", sameTeacherAssignments);
  await classAssignmentRepository.replaceForClass("1", classAssignments);
  assert.deepEqual(classAssignmentRepository.snapshot(), before);
});

test("one assignment save produces exactly one cache publication", () => {
  let publications = 0;
  const queryClient = {
    setQueryData() {
      publications += 1;
    },
  };
  publishQuerySnapshot(queryClient, ["mock", "class-assignments"], []);
  assert.equal(publications, 1);
});

test("backend-shaped repositories preserve generated IDs and pagination metadata", async () => {
  const repository = new MockTeacherRepository([]);
  const teacherInput = {
    name: "Generated ID Teacher",
    email: "",
    phone: "",
    courseIds: [],
    availableDaySlotIds: [],
    status: "active",
  };
  const created = await repository.create(teacherInput);

  assert.ok(created.id);
  assert.equal((await repository.getById(created.id))?.id, created.id);
  await repository.create({ ...teacherInput, name: "Second Teacher" });

  const page = await repository.list({ page: 2, pageSize: 1 });
  assert.equal(page.page, 2);
  assert.equal(page.pageSize, 1);
  assert.equal(page.total, 2);
  assert.equal(page.items.length, 1);
});

test("pagination and AbortSignal are forwarded through the repository list contract", async () => {
  const repository = new MockTeacherRepository([]);
  const controller = new AbortController();
  const page = await repository.list({ page: 3, pageSize: 25, signal: controller.signal });
  assert.equal(page.page, 3);
  assert.equal(page.pageSize, 25);

  controller.abort();
  assert.throws(
    () => repository.list({ page: 1, pageSize: 10, signal: controller.signal }),
    (error) => error.name === "AbortError",
  );
});

test("new assignment IDs are repository-generated while existing IDs are preserved", async () => {
  const before = classAssignmentRepository.snapshot();
  const classId = "1";
  const existing = before.filter((assignment) => assignment.classId === classId);
  const result = await classAssignmentRepository.replaceForClass(classId, [
    existing[0],
    existing[1],
    {
      classId,
      courseId: "2",
      teacherId: "2",
      weeklyPeriods: 2,
    },
  ]);

  assert.equal(result[0].id, existing[0].id);
  assert.equal(result[1].id, existing[1].id);
  assert.ok(result[2].id);
  await classAssignmentRepository.replaceForClass(classId, existing);
});

test("active hooks depend on configured repository interfaces, not mock implementations", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../src/lib/mock-queries.ts", import.meta.url)),
    "utf8",
  );
  assert.doesNotMatch(source, /from ["']@\/lib\/mock-repositories["']/);
  assert.match(source, /from ["']@\/lib\/repositories\/configured["']/);
  assert.match(source, /repository\.list\(\{ \.\.\.params, signal:/);
});

test("FastAPI mappers preserve backend IDs and translate snake_case contracts", () => {
  const timestamp = "2026-07-30T00:00:00Z";
  assert.equal(
    mapTeacher({
      id: 12,
      school_id: 2,
      name: "Teacher",
      code: "T-1",
      phone: null,
      active: true,
      created_at: timestamp,
      updated_at: timestamp,
    }).id,
    "12",
  );
  assert.equal(
    mapCourse({
      id: 20,
      school_id: 2,
      name: "Physics",
      major_id: 3,
      grade: 10,
      category: "specialized",
      active: true,
      course_code: "PHYS-10",
      created_at: timestamp,
      updated_at: timestamp,
    }).majorId,
    "major-3",
  );
  assert.equal(
    mapClass({
      id: 30,
      school_id: 2,
      major_id: 3,
      name: "10-A",
      grade: 10,
      active: true,
      created_at: timestamp,
      updated_at: timestamp,
    }).gradeId,
    "10",
  );
  assert.equal(
    mapClassAssignment({
      id: 40,
      school_id: 2,
      class_id: 30,
      course_id: 20,
      course_name: "Physics",
      teacher_id: 12,
      teacher_name: "Teacher",
      slots_per_week: 4,
      active: true,
      created_at: timestamp,
      updated_at: timestamp,
    }).weeklyPeriods,
    4,
  );
  assert.equal(
    mapDaySlot({
      id: 50,
      school_id: 2,
      day_id: 1,
      slot_number: 2,
      title: null,
      start_time: "08:00:00",
      end_time: "09:00:00",
      active: true,
      created_at: timestamp,
      updated_at: timestamp,
    }).dayId,
    1,
  );
});

test("API assignment replacement reports the missing backend transaction", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../src/lib/api/api-repositories.ts", import.meta.url)),
    "utf8",
  );
  assert.match(source, /class BackendCapabilityError/);
  assert.match(source, /atomic bulk assignment replacement endpoint/);
  assert.doesNotMatch(source, /mockClassAssignmentRepository/);
});

test("day-slot requests never send the backend response-only active field", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../src/lib/api/schools-store.ts", import.meta.url)),
    "utf8",
  );
  const entryBlock = source.slice(
    source.indexOf("interface DaySlotEntry"),
    source.indexOf("export const WEEK_DAYS"),
  );
  assert.doesNotMatch(entryBlock, /\bactive\s*:/);
});
