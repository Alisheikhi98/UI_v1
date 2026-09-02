import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";

process.env.VITE_API_BASE_URL = "http://class-unavailability.test";

const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
  dispatchEvent: () => true,
};

const [{ setAccessToken, clearAccessToken }, { ApiClassUnavailableSlotsRepository }] =
  await Promise.all([
    import("../src/lib/auth-token.ts"),
    import("../src/lib/api/api-repositories.ts"),
  ]);
const {
  getClassUnavailableSlotsErrorMessage,
  selectValidUnavailableSlotIds,
  toggleUnavailableSlotSelection,
} = await import("../src/lib/class-unavailability.ts");
const { ApiError } = await import("../src/lib/api/client.ts");
const { repositoryQueryKeys } = await import("../src/lib/repository-query-keys.ts");

setAccessToken("class-unavailability-test-token");
const originalFetch = globalThis.fetch;

after(() => {
  globalThis.fetch = originalFetch;
  clearAccessToken();
  delete globalThis.window;
});

const timestamp = "2026-09-02T10:00:00Z";

test("Class unavailable slots use the authoritative scoped GET and PUT contract", async () => {
  const requests = [];
  let savedIds = [12, 15];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : null;
    requests.push({ url, method, body });
    if (method === "PUT") savedIds = body.day_slot_ids;
    return Response.json(
      savedIds.map((daySlotId, index) => ({
        id: 800 + index,
        school_id: 9,
        class_id: 101,
        day_slot_id: daySlotId,
        created_at: timestamp,
      })),
    );
  };

  const repository = new ApiClassUnavailableSlotsRepository(() => "9");
  assert.deepEqual(await repository.list("101"), ["12", "15"]);
  assert.deepEqual(await repository.replace("101", ["15", "19"]), ["15", "19"]);
  assert.deepEqual(await repository.replace("101", []), []);
  assert.deepEqual(
    requests.map(({ method, url }) => `${method} ${url.pathname}`),
    [
      "GET /schools/9/classes/101/unavailable-slots",
      "PUT /schools/9/classes/101/unavailable-slots",
      "PUT /schools/9/classes/101/unavailable-slots",
    ],
  );
  assert.deepEqual(requests[1].body, { day_slot_ids: [15, 19] });
  assert.deepEqual(requests[2].body, { day_slot_ids: [] });
});

test("selection keeps authoritative active DaySlot IDs and supports toggling", () => {
  const groups = [
    {
      dayId: 1,
      dayName: "Saturday",
      slots: [
        {
          id: "12",
          schoolId: "9",
          dayId: 1,
          slotNumber: 1,
          title: null,
          startTime: null,
          endTime: null,
          active: true,
        },
        {
          id: "15",
          schoolId: "9",
          dayId: 1,
          slotNumber: 2,
          title: null,
          startTime: null,
          endTime: null,
          active: false,
        },
        {
          id: "19",
          schoolId: "9",
          dayId: 1,
          slotNumber: 5,
          title: null,
          startTime: null,
          endTime: null,
          active: true,
        },
      ],
    },
  ];
  const selected = selectValidUnavailableSlotIds(["12", "15", "999"], groups);
  assert.deepEqual([...selected], ["12"]);
  assert.deepEqual([...toggleUnavailableSlotSelection(selected, "19")], ["12", "19"]);
  assert.deepEqual([...toggleUnavailableSlotSelection(selected, "12")], []);
});

test("query keys are scoped by School and Class", () => {
  assert.deepEqual(repositoryQueryKeys.classUnavailableSlots("9", "101"), [
    "schools",
    "9",
    "classes",
    "101",
    "unavailable-slots",
  ]);
});

test("Classes UI loads restrictions lazily and renders dynamic desktop/mobile controls", async () => {
  const [routeSource, dialogSource, querySource] = await Promise.all([
    readFile(new URL("../src/routes/dashboard.classes.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/components/classes/class-unavailable-slots-dialog.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/lib/class-unavailability.ts", import.meta.url), "utf8"),
  ]);
  assert.match(routeSource, /روز و زنگ خالی/);
  assert.match(routeSource, /setUnavailabilityClass\(classItem\)/);
  assert.match(routeSource, /unavailabilityClass \? \(/);
  assert.doesNotMatch(routeSource, /filteredClasses\.map[\s\S]{0,300}useClassUnavailableSlots/);
  assert.match(dialogSource, /useClassUnavailableSlots\(classItem\.id\)/);
  assert.match(dialogSource, /daySlots\.data \?\? \[\]\)\.map\(\(group\)/);
  assert.match(dialogSource, /aria-pressed=\{selected\}/);
  assert.match(dialogSource, /در حال ذخیره…/);
  assert.match(dialogSource, /پاک کردن همه/);
  assert.match(dialogSource, /await replaceUnavailableSlots\.mutateAsync/);
  assert.ok(
    dialogSource.indexOf("await replaceUnavailableSlots.mutateAsync") <
      dialogSource.indexOf("onOpenChange(false)"),
  );
  assert.match(dialogSource, /onClick=\{\(\) => onOpenChange\(false\)\}/);
  assert.match(dialogSource, /disabled=\{isSaving \|\| loading/);
  assert.match(querySource, /classUnavailableSlots\(schoolId, variables\.classId\)/);
  assert.match(querySource, /exact: true, refetchType: "none"/);
  assert.match(querySource, /refetchQueries/);
  assert.match(querySource, /finalTimetableRoot\(schoolId\)/);
});

test("Class unavailable-slot errors are localized and never expose backend details", () => {
  const raw = 'duplicate key value violates constraint "private_name"';
  assert.equal(
    getClassUnavailableSlotsErrorMessage(new ApiError(raw, 404, { detail: raw }), "load"),
    "کلاس یا زنگ انتخاب‌شده در این مدرسه پیدا نشد.",
  );
  assert.equal(
    getClassUnavailableSlotsErrorMessage(new ApiError(raw, 422, { detail: raw }), "save"),
    "زنگ‌های انتخاب‌شده معتبر نیستند.",
  );
  assert.doesNotMatch(
    getClassUnavailableSlotsErrorMessage(new ApiError(raw, 500, { detail: raw }), "save"),
    /duplicate|private_name/,
  );
});
