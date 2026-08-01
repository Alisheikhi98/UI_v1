import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { repositoryQueryKeys } from "../src/lib/repository-query-keys.ts";
import {
  normalizeDaySlotGroups,
  sanitizeAvailabilitySelection,
  TeacherAvailabilitySaveGuard,
  TeacherAvailabilitySaveInProgressError,
  toggleAvailabilitySlot,
  toggleWeekdayAvailability,
} from "../src/lib/teacher-availability.ts";

const slot = (overrides = {}) => ({
  id: "slot-1",
  schoolId: "10",
  dayId: 1,
  slotNumber: 1,
  title: null,
  startTime: "08:00",
  endTime: "09:00",
  active: true,
  ...overrides,
});

const groups = [
  {
    dayId: 1,
    dayName: "Day One",
    slots: [slot({ id: "slot-2", slotNumber: 2, startTime: "09:00", endTime: "10:00" }), slot()],
  },
  {
    dayId: 2,
    dayName: "Day Two",
    slots: [slot({ id: "slot-3", dayId: 2 })],
  },
];

test("day slots are grouped by backend weekday metadata and ordered by slot number", () => {
  const normalized = normalizeDaySlotGroups([
    ...groups,
    {
      dayId: 3,
      dayName: "Day Three",
      slots: [
        slot({ id: "inactive", dayId: 3, active: false }),
        slot({ id: "wrong-day", dayId: 4 }),
      ],
    },
  ]);

  assert.deepEqual(
    normalized.map((group) => ({
      dayId: group.dayId,
      dayName: group.dayName,
      slotIds: group.slots.map((item) => item.id),
    })),
    [
      { dayId: 1, dayName: "Day One", slotIds: ["slot-1", "slot-2"] },
      { dayId: 2, dayName: "Day Two", slotIds: ["slot-3"] },
      { dayId: 3, dayName: "Day Three", slotIds: [] },
    ],
  );
});

test("select-all toggles only the slots belonging to one weekday", () => {
  const selected = toggleWeekdayAvailability(["slot-3"], groups[0]);
  assert.deepEqual(new Set(selected), new Set(["slot-1", "slot-2", "slot-3"]));

  const cleared = toggleWeekdayAvailability(selected, groups[0]);
  assert.deepEqual(cleared, ["slot-3"]);
});

test("individual slot selection can be selected and cleared", () => {
  assert.deepEqual(toggleAvailabilitySlot([], "slot-1"), ["slot-1"]);
  assert.deepEqual(toggleAvailabilitySlot(["slot-1"], "slot-1"), []);
});

test("editing maps existing day-slot IDs to valid checkboxes", () => {
  assert.deepEqual(sanitizeAvailabilitySelection(groups, ["slot-3", "slot-1"]), [
    "slot-1",
    "slot-3",
  ]);
});

test("deleted or unavailable day-slot IDs are ignored safely", () => {
  assert.deepEqual(sanitizeAvailabilitySelection(groups, ["deleted-slot", "slot-2"]), ["slot-2"]);
});

test("successful availability replacement returns the submitted slot IDs", async () => {
  const guard = new TeacherAvailabilitySaveGuard();
  let stored = [];
  const result = await guard.run(async () => {
    stored = ["slot-1", "slot-3"];
    return stored;
  });

  assert.deepEqual(result, ["slot-1", "slot-3"]);
  assert.deepEqual(stored, result);
});

test("failed availability replacement propagates its API error and releases pending state", async () => {
  const guard = new TeacherAvailabilitySaveGuard();
  const apiError = new Error("Availability replacement failed.");

  await assert.rejects(
    guard.run(async () => {
      throw apiError;
    }),
    (error) => error === apiError,
  );
  assert.equal(await guard.run(async () => "retry succeeded"), "retry succeeded");
});

test("pending-state protection rejects repeated availability saves", async () => {
  const guard = new TeacherAvailabilitySaveGuard();
  let resolveSave;
  const firstSave = guard.run(
    () =>
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
  );

  await assert.rejects(
    guard.run(async () => undefined),
    TeacherAvailabilitySaveInProgressError,
  );
  resolveSave("saved");
  assert.equal(await firstSave, "saved");
});

test("day-slot and availability cache keys are separated by school and teacher", () => {
  assert.notDeepEqual(repositoryQueryKeys.daySlots("1"), repositoryQueryKeys.daySlots("2"));
  assert.notDeepEqual(
    repositoryQueryKeys.teacherAvailability("1", "10"),
    repositoryQueryKeys.teacherAvailability("2", "10"),
  );
  assert.notDeepEqual(
    repositoryQueryKeys.teacherAvailability("1", "10"),
    repositoryQueryKeys.teacherAvailability("1", "11"),
  );
  assert.deepEqual(repositoryQueryKeys.daySlots("1"), ["schools", "1", "day-slots"]);
  assert.deepEqual(repositoryQueryKeys.teacherAvailability("1", "10"), [
    "schools",
    "1",
    "teachers",
    "10",
    "availability",
  ]);
});

test("real repositories use the weekly slot endpoint and dedicated availability payload", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../src/lib/api/api-repositories.ts", import.meta.url)),
    "utf8",
  );
  const teacherProfileBlock = source.slice(
    source.indexOf("export class ApiTeacherRepository"),
    source.indexOf("export class ApiTeacherAvailabilityRepository"),
  );
  const availabilityBlock = source.slice(
    source.indexOf("export class ApiTeacherAvailabilityRepository"),
    source.indexOf("export class ApiTeacherCoursesRepository"),
  );
  const daySlotBlock = source.slice(
    source.indexOf("export class ApiDaySlotRepository"),
    source.indexOf("export class ApiCourseRepository"),
  );

  assert.match(daySlotBlock, /\/day-slots\/week/);
  assert.match(availabilityBlock, /day_slot_ids:/);
  assert.doesNotMatch(teacherProfileBlock, /day_slot_ids|availableDaySlotIds/);
});
