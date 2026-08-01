import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import {
  createCompatibleCourse,
  createCourseInputForClass,
  IncompatibleCreatedCourseError,
  selectCreatedCourseInDraft,
} from "../src/lib/course-creation.ts";
import { mapCourseCreateInputToDto } from "../src/lib/api/mappers.ts";
import { MockClassRepository, MockCourseRepository } from "../src/lib/mock-repositories.ts";
import { repositoryQueryKeys } from "../src/lib/repository-query-keys.ts";

const selectedClass = {
  id: "42",
  name: "دهم تجربی",
  gradeId: "10",
  majorId: "major-7",
  studentCapacity: 0,
};

const createdCourse = {
  id: "server-901",
  name: "زیست‌شناسی",
  active: true,
  gradeId: selectedClass.gradeId,
  majorId: selectedClass.majorId,
  category: "specialized",
  code: "",
  weeklyHours: 1,
  color: "#1E40AF",
};

test("Class Management creates the Course payload from the selected Class", () => {
  const input = createCourseInputForClass(selectedClass, createdCourse.name);

  assert.deepEqual(input, {
    name: createdCourse.name,
    gradeId: "10",
    majorId: "major-7",
    category: "specialized",
    active: true,
  });
  assert.deepEqual(mapCourseCreateInputToDto(input), {
    name: createdCourse.name,
    major_id: 7,
    grade: 10,
    category: "specialized",
    active: true,
  });
});

test("creation refetches the exact school and compatible queries and preserves the server ID", async () => {
  const listCalls = [];
  const repository = {
    async create(input) {
      assert.equal(input.gradeId, selectedClass.gradeId);
      assert.equal(input.majorId, selectedClass.majorId);
      return structuredClone(createdCourse);
    },
    async list(params = {}) {
      listCalls.push(structuredClone(params.filters ?? null));
      return {
        items: params.filters?.classId
          ? [structuredClone(createdCourse)]
          : [structuredClone(createdCourse)],
        total: 1,
        page: 1,
        pageSize: 1,
      };
    },
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidatedKeys = [];
  const invalidateQueries = queryClient.invalidateQueries.bind(queryClient);
  queryClient.invalidateQueries = (filters, options) => {
    invalidatedKeys.push(filters.queryKey);
    return invalidateQueries(filters, options);
  };

  const result = await createCompatibleCourse({
    repository,
    queryClient,
    schoolId: "5",
    classId: selectedClass.id,
    input: createCourseInputForClass(selectedClass, createdCourse.name),
  });

  assert.equal(result.id, "server-901");
  assert.deepEqual(invalidatedKeys, [
    repositoryQueryKeys.courses("5"),
    repositoryQueryKeys.courses("5", "42"),
  ]);
  assert.deepEqual(listCalls, [null, { classId: "42" }]);
  assert.equal(
    queryClient.getQueryData(repositoryQueryKeys.courses("5", "42")).items[0].id,
    "server-901",
  );
  queryClient.clear();
});

test("the newly compatible Course is auto-selected only in its originating draft row", () => {
  const draft = [
    { draftId: "draft-a", courseId: "", teacherId: "", classId: "42", weeklyPeriods: 1 },
    { draftId: "draft-b", courseId: "12", teacherId: "", classId: "42", weeklyPeriods: 1 },
  ];

  const result = selectCreatedCourseInDraft(draft, "draft-a", createdCourse.id);

  assert.equal(result[0].courseId, "server-901");
  assert.equal(result[1].courseId, "12");
});

test("an incompatible created Course rejects the workflow instead of reporting success", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const repository = {
    async create() {
      return structuredClone(createdCourse);
    },
    async list(params = {}) {
      return {
        items: params.filters?.classId ? [] : [structuredClone(createdCourse)],
        total: params.filters?.classId ? 0 : 1,
        page: 1,
        pageSize: 1,
      };
    },
  };

  await assert.rejects(
    createCompatibleCourse({
      repository,
      queryClient,
      schoolId: "5",
      classId: selectedClass.id,
      input: createCourseInputForClass(selectedClass, createdCourse.name),
    }),
    IncompatibleCreatedCourseError,
  );
  queryClient.clear();
});

test("mock compatible-Course filtering uses stable Class grade and major IDs", async () => {
  const classes = new MockClassRepository([selectedClass]);
  const compatible = structuredClone(createdCourse);
  const wrongMajor = { ...structuredClone(createdCourse), id: "other", majorId: "major-9" };
  const courses = new MockCourseRepository([compatible, wrongMajor], classes);

  const result = await courses.list({ filters: { classId: selectedClass.id } });

  assert.deepEqual(
    result.items.map((course) => course.id),
    [compatible.id],
  );
});

test("real API Course flow has no mock fallback dependency", async () => {
  const [apiRepositorySource, courseCreationSource, routeSource] = await Promise.all([
    readFile(new URL("../src/lib/api/api-repositories.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/course-creation.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/dashboard.classes.tsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(apiRepositorySource, /mock-repositor/i);
  assert.doesNotMatch(courseCreationSource, /mock-repositor/i);
  assert.doesNotMatch(routeSource, /mock-repositor/i);
});
