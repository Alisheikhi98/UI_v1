import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";

import { repositoryQueryKeys } from "../src/lib/repository-query-keys.ts";
import { parseTimetableRouteSearch } from "../src/lib/timetable.ts";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Timetable search preserves a requested Class and rejects invalid modes", () => {
  assert.deepEqual(parseTimetableRouteSearch({ mode: "class", classId: " 42 " }), {
    mode: "class",
    classId: "42",
    teacherId: undefined,
  });
  assert.deepEqual(parseTimetableRouteSearch({ mode: "invalid", classId: "" }), {
    mode: undefined,
    classId: undefined,
    teacherId: undefined,
  });
});

test("published Class schedule cache is school/Class scoped and reuses fresh data", async () => {
  const queryClient = new QueryClient();
  const queryKey = repositoryQueryKeys.publishedClassSchedule("9", "42");
  let requests = 0;
  const queryFn = async () => {
    requests += 1;
    return { classId: "42", className: "دهم الف", items: [] };
  };

  await queryClient.fetchQuery({ queryKey, queryFn, staleTime: 30_000 });
  await queryClient.fetchQuery({ queryKey, queryFn, staleTime: 30_000 });

  assert.deepEqual(queryKey, ["schools", "9", "final-timetable", "class", "42"]);
  assert.equal(requests, 1);
});

test("desktop and mobile Classes actions navigate directly to the requested Class timetable", async () => {
  const [route, queries] = await Promise.all([
    readSource("../src/routes/dashboard.classes.tsx"),
    readSource("../src/lib/timetable-queries.ts"),
  ]);

  assert.match(route, /function ViewTimetableAction/);
  assert.equal((route.match(/<ViewTimetableAction/g) ?? []).length, 2);
  assert.match(route, /to: "\/dashboard\/timetable"/);
  assert.match(route, /search: \{ mode: "class", classId: classItem\.id \}/);
  assert.doesNotMatch(route, /usePublishedClassScheduleCheck/);
  assert.doesNotMatch(route, /checkingTimetableClassId|timetableFeedback/);
  assert.match(queries, /repositoryQueryKeys\.publishedClassSchedule\(schoolId, classId\)/);
  assert.doesNotMatch(queries, /useQueries\([\s\S]*publishedClassSchedule/);
});

test("Weekly Timetable derives Class mode and selection from refresh-safe URL search", async () => {
  const route = await readSource("../src/routes/dashboard.timetable.tsx");

  assert.match(route, /validateSearch: parseTimetableRouteSearch/);
  assert.match(route, /const search = Route\.useSearch\(\)/);
  assert.match(route, /const mode = search\.mode \?\? "school"/);
  assert.match(route, /const selectedClassId = search\.classId \?\? ""/);
  assert.match(route, /search: \(previous\) => \(\{ \.\.\.previous, mode: "class", classId:/);
  assert.match(route, /!selectedClassId \|\| !selectedClass/);
  assert.doesNotMatch(route, /useState<TimetableViewMode>\("school"\)/);
});
