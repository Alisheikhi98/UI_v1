import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { mapWeeklyDaySlots } from "../src/lib/api/mappers.ts";
import { createTeacherCoursesQueryOptions } from "../src/lib/teacher-courses.ts";
import { repositoryQueryKeys } from "../src/lib/repository-query-keys.ts";
import { BACKEND_WEEKDAY_NAMES, getWeekdayDisplayLabel } from "../src/lib/weekday-labels.ts";

test("the initial Teacher list does not create per-Teacher Courses queries", async () => {
  const path = fileURLToPath(new URL("../src/lib/mock-queries.ts", import.meta.url));
  const source = await readFile(path, "utf8");
  const initialListHook = source.slice(
    source.indexOf("export function useTeachersRepository"),
    source.indexOf("export function useTeacherCoursesQuery"),
  );

  assert.doesNotMatch(initialListHook, /teacherCourses\.list/);
  assert.match(initialListHook, /enabled: Boolean\(options\.includeAvailability\)/);
});

test("deferred Teacher Courses loading forwards the Teacher ID and AbortSignal", async () => {
  const calls = [];
  const expectedCourses = [{ id: "course-7", name: "Physics" }];
  const repository = {
    async list(teacherId, options) {
      calls.push({ teacherId, signal: options?.signal });
      return expectedCourses;
    },
  };
  const controller = new AbortController();

  const courses = await createTeacherCoursesQueryOptions(repository, "teacher-3").queryFn({
    signal: controller.signal,
  });

  assert.equal(courses, expectedCourses);
  assert.deepEqual(calls, [{ teacherId: "teacher-3", signal: controller.signal }]);
});

test("Teacher Courses cache keys cannot leak across schools or Teachers", () => {
  assert.notDeepEqual(
    repositoryQueryKeys.teacherCourses("school-1", "teacher-1"),
    repositoryQueryKeys.teacherCourses("school-1", "teacher-2"),
  );
  assert.notDeepEqual(
    repositoryQueryKeys.teacherCourses("school-1", "teacher-1"),
    repositoryQueryKeys.teacherCourses("school-2", "teacher-1"),
  );
});

test("all supported backend weekday names render in Persian regardless of case", () => {
  assert.deepEqual(BACKEND_WEEKDAY_NAMES.map(getWeekdayDisplayLabel), [
    "شنبه",
    "یکشنبه",
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنجشنبه",
    "جمعه",
  ]);
  assert.equal(getWeekdayDisplayLabel("sAtUrDaY"), "شنبه");
});

test("weekday presentation preserves backend names and IDs", () => {
  const backendDto = {
    days: [
      {
        day_id: 1,
        day_name: "Saturday",
        slots: [
          {
            id: 10,
            school_id: 20,
            day_id: 1,
            slot_number: 2,
            title: null,
            start_time: "08:00:00",
            end_time: "09:00:00",
            active: true,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
      },
    ],
  };

  const [group] = mapWeeklyDaySlots(backendDto);
  assert.equal(group.dayId, 1);
  assert.equal(group.dayName, "Saturday");
  assert.equal(group.slots[0].dayId, 1);
  assert.equal(getWeekdayDisplayLabel(group.dayName), "شنبه");
});

test("unknown or missing weekday values fail safely", () => {
  assert.equal(getWeekdayDisplayLabel("Custom School Day"), "Custom School Day");
  assert.equal(getWeekdayDisplayLabel("  Custom School Day  "), "Custom School Day");
  assert.equal(getWeekdayDisplayLabel(null), "روز نامشخص");
  assert.equal(getWeekdayDisplayLabel(99), "99");
});
