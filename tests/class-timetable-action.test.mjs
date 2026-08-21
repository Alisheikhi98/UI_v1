import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";

import {
  CLASS_TIMETABLE_FEEDBACK_DURATION_MS,
  createClassTimetableFeedbackController,
} from "../src/lib/class-timetable-feedback.ts";
import { repositoryQueryKeys } from "../src/lib/repository-query-keys.ts";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("transient Class timetable feedback belongs to the clicked Class and replaces its timer", () => {
  const changes = [];
  const scheduled = new Map();
  let nextTimerId = 0;
  const controller = createClassTimetableFeedbackController((feedback) => changes.push(feedback), {
    schedule(callback, delay) {
      const id = ++nextTimerId;
      scheduled.set(id, { callback, delay, cancelled: false });
      return id;
    },
    cancel(id) {
      scheduled.get(id).cancelled = true;
    },
  });

  controller.show({ classId: "class-a", message: "برنامه هنوز آماده نیست." });
  controller.show({ classId: "class-a", message: "برنامه هنوز آماده نیست." });

  assert.equal(scheduled.size, 2);
  assert.equal(scheduled.get(1).cancelled, true);
  assert.equal(scheduled.get(2).delay, CLASS_TIMETABLE_FEEDBACK_DURATION_MS);
  assert.equal(changes.at(-1).classId, "class-a");

  scheduled.get(2).callback();
  assert.equal(changes.at(-1), null);

  controller.show({ classId: "class-b", message: "وضعیت برنامه قابل بررسی نیست." });
  assert.equal(changes.at(-1).classId, "class-b");
  controller.dispose();
  assert.equal(scheduled.get(3).cancelled, true);
});

test("published Class schedule checks are school/Class scoped and reuse fresh React Query data", async () => {
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

test("desktop and mobile Classes actions share the guarded published-timetable interaction", async () => {
  const [route, queries] = await Promise.all([
    readSource("../src/routes/dashboard.classes.tsx"),
    readSource("../src/lib/timetable-queries.ts"),
  ]);

  assert.match(route, /function ViewTimetableAction/);
  assert.equal((route.match(/<ViewTimetableAction/g) ?? []).length, 2);
  assert.match(route, /feedback\?\.classId === classItem\.id/);
  assert.match(route, /await publishedClassSchedule\.check\(classItem\.id\)/);
  assert.match(route, /if \(!isPublished\)/);
  assert.match(route, /برنامه هنوز آماده نیست\./);
  assert.match(route, /وضعیت برنامه قابل بررسی نیست\./);
  assert.match(route, /aria-live="polite"/);
  assert.match(route, /motion-reduce:animate-none/);
  assert.match(route, /disabled=\{isChecking\}/);
  assert.doesNotMatch(route, /onClick=\{\(\) => navigate\(\{ to: "\/dashboard\/timetable" \}\)\}/);
  assert.match(queries, /scheduleApi\.getClassSchedule\(schoolId, classId, \{ signal \}\)/);
  assert.match(queries, /queryClient\.fetchQuery\(\{[\s\S]*publishedClassSchedule/);
  assert.doesNotMatch(queries, /useQueries\([\s\S]*publishedClassSchedule/);
});
