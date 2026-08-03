import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { resolveActiveSchoolId } from "../src/lib/active-school.ts";
import { SchoolRepository } from "../src/lib/api/school-repository.ts";
import { MockSchoolPersistenceAdapter } from "../src/lib/api/schools-mock.ts";

const readSource = async (relativePath) =>
  readFile(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const schoolInput = {
  name: "مدرسه یک",
  slug: "school-one",
  workingDays: ["شنبه"],
  timing: { periodsCount: 1, dayStart: "08:00", classDuration: 45, breakDuration: 0 },
  periods: [{ index: 1, start: "08:00", end: "08:45" }],
};

function emptySchoolRepository() {
  const values = new Map([["dev_mock_schools", "[]"]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  return new SchoolRepository(new MockSchoolPersistenceAdapter(storage));
}

test("zero-School state permits the first School and blocks a second", async () => {
  const repository = emptySchoolRepository();
  assert.deepEqual(await repository.getAll(), []);

  const created = await repository.create(schoolInput);
  assert.equal(created.name, schoolInput.name);
  assert.equal((await repository.getAll()).length, 1);
  await assert.rejects(
    repository.create({ ...schoolInput, name: "مدرسه دو", slug: "school-two" }),
    /فقط یک مدرسه/,
  );
});

test("active School restoration keeps the valid ID and recovers invalid storage", () => {
  assert.equal(resolveActiveSchoolId("12", [12]), "12");
  assert.equal(resolveActiveSchoolId("99", [12]), "12");
  assert.equal(resolveActiveSchoolId("99", []), null);
});

test("Schools API mode uses the weekly Day Slot contract and supports clear-all", async () => {
  const storeSource = await readSource("../src/lib/api/schools-store.ts");
  const routeSource = await readSource("../src/routes/dashboard.schools.tsx");
  assert.match(storeSource, /\/day-slots\/week/);
  assert.match(storeSource, /day\.day_id/);
  assert.doesNotMatch(storeSource, /WEEK_DAYS\.indexOf\(day\)/);
  assert.doesNotMatch(storeSource, /if \(desiredEntries\.length === 0\) return/);
  assert.match(storeSource, /getObsoleteDaySlots\(existingSlots, desiredEntries\)/);
  assert.match(storeSource, /delete-check/);
  assert.match(storeSource, /confirm_delete_dependencies/);
  assert.doesNotMatch(routeSource, /حداقل یک روز کاری/);
});

test("School mutations require an authoritative refetch before success", async () => {
  const querySource = await readSource("../src/lib/api/school-queries.ts");
  assert.match(querySource, /invalidateQueries/);
  assert.match(querySource, /refetchQueries/);
  assert.doesNotMatch(querySource, /setQueryData/);
  assert.match(querySource, /confirmedSchools\.find/);
});

test("API mode has no School mock fallback and unsupported actions are absent", async () => {
  const storeSource = await readSource("../src/lib/api/schools-store.ts");
  const routeSource = await readSource("../src/routes/dashboard.schools.tsx");
  assert.match(storeSource, /USE_MOCK_API\s*\?\s*new \(await import\("\.\/schools-mock"\)\)/);
  assert.doesNotMatch(storeSource, /catch[\s\S]{0,200}schools-mock/);
  assert.doesNotMatch(routeSource, /deleteTarget|حذف قطعی|school-status/);
  assert.match(routeSource, /schools\.length === 0/);
});
