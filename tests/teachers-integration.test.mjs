import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

process.env.VITE_API_BASE_URL = "http://teachers.test";

const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
  dispatchEvent: () => true,
};

const [{ setAccessToken, clearAccessToken }, repositoriesModule, clientModule, errorsModule] =
  await Promise.all([
    import("../src/lib/auth-token.ts"),
    import("../src/lib/api/api-repositories.ts"),
    import("../src/lib/api/client.ts"),
    import("../src/lib/teacher-errors.ts"),
  ]);

const { ApiTeacherAvailabilityRepository, ApiTeacherCoursesRepository, ApiTeacherRepository } =
  repositoriesModule;
const { ApiError } = clientModule;
const { getTeacherFieldErrors, getTeacherErrorMessage } = errorsModule;

setAccessToken("teachers-test-token");
const originalFetch = globalThis.fetch;

after(() => {
  globalThis.fetch = originalFetch;
  clearAccessToken();
  delete globalThis.window;
});

const readSource = async (relativePath) =>
  readFile(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const timestamp = "2026-08-03T10:00:00Z";
const teacherDto = (overrides = {}) => ({
  id: 1,
  school_id: 9,
  name: "معلم آزمون",
  code: null,
  phone: null,
  active: true,
  created_at: timestamp,
  updated_at: timestamp,
  ...overrides,
});

test("Teacher CRUD forwards backend search/filter contracts and preserves server IDs", async () => {
  const requests = [];
  let teachers = [];
  let nextId = 40;

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    requests.push({ url, method, body: init.body ? JSON.parse(String(init.body)) : null, init });

    if (url.pathname === "/schools/9/teachers" && method === "GET") {
      const active = url.searchParams.get("active");
      const search = url.searchParams.get("search")?.toLocaleLowerCase() ?? "";
      const items = teachers.filter(
        (teacher) =>
          String(teacher.active) === active &&
          (!search ||
            teacher.name.toLocaleLowerCase().includes(search) ||
            (teacher.code ?? "").toLocaleLowerCase().includes(search)),
      );
      return Response.json({ items, page: 1, size: 25, total: items.length, pages: 1 });
    }

    if (url.pathname === "/schools/9/teachers" && method === "POST") {
      const created = teacherDto({ id: ++nextId, ...JSON.parse(String(init.body)) });
      teachers.push(created);
      return Response.json(created, { status: 201 });
    }

    const teacherMatch = url.pathname.match(/^\/schools\/9\/teachers\/(\d+)$/);
    if (teacherMatch && method === "PATCH") {
      const id = Number(teacherMatch[1]);
      teachers = teachers.map((teacher) =>
        teacher.id === id ? { ...teacher, ...JSON.parse(String(init.body)) } : teacher,
      );
      return Response.json(teachers.find((teacher) => teacher.id === id));
    }
    if (teacherMatch && method === "DELETE") {
      const id = Number(teacherMatch[1]);
      teachers = teachers.map((teacher) =>
        teacher.id === id ? { ...teacher, active: false } : teacher,
      );
      return Response.json(teachers.find((teacher) => teacher.id === id));
    }

    return Response.json({ detail: "Not found" }, { status: 404 });
  };

  const repository = new ApiTeacherRepository(() => "9");
  const created = await repository.create({
    name: "معلم آزمون",
    personnel_code: "T-401",
    phone: "09123456789",
  });
  assert.equal(created.id, "41");
  assert.deepEqual(requests[0].body, {
    name: "معلم آزمون",
    code: "T-401",
    phone: "09123456789",
  });

  const listed = await repository.list({
    page: 1,
    pageSize: 25,
    search: "T-401",
    filters: { active: true },
  });
  assert.equal(listed.items[0].id, created.id);
  assert.equal(requests[1].url.searchParams.get("search"), "T-401");
  assert.equal(requests[1].url.searchParams.get("active"), "true");
  assert.equal(requests[1].url.searchParams.get("size"), "25");
  assert.equal(
    new Headers(requests[1].init.headers).get("Authorization"),
    "Bearer teachers-test-token",
  );

  const updated = await repository.update(created.id, {
    name: "معلم ویرایش‌شده",
    personnel_code: "",
    phone: "",
  });
  assert.equal(updated.id, created.id);
  assert.deepEqual(requests[2].body, {
    name: "معلم ویرایش‌شده",
    code: null,
    phone: null,
  });
  assert.equal((await repository.list({ filters: { active: true } })).items[0].name, updated.name);

  await repository.delete(created.id);
  assert.equal((await repository.list({ filters: { active: true } })).items.length, 0);
  assert.equal((await repository.list({ filters: { active: false } })).items[0].id, created.id);
});

test("Teacher Availability persists only authoritative day-slot IDs", async () => {
  const payloads = [];
  let selectedIds = [11, 12];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    if (method === "PUT") {
      const payload = JSON.parse(String(init.body));
      payloads.push(payload);
      selectedIds = payload.day_slot_ids;
    }
    return Response.json(
      selectedIds.map((daySlotId, index) => ({
        id: index + 1,
        school_id: 9,
        teacher_id: 41,
        day_slot_id: daySlotId,
        availability_type: "available",
        created_at: timestamp,
        updated_at: timestamp,
      })),
    );
  };

  const repository = new ApiTeacherAvailabilityRepository(() => "9");
  assert.deepEqual(await repository.list("41"), ["11", "12"]);
  assert.deepEqual(await repository.replace("41", ["12", "15"]), ["12", "15"]);
  assert.deepEqual(payloads, [{ day_slot_ids: [12, 15] }]);
});

test("Teacher Courses use authoritative display names and remain scoped", async () => {
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return Response.json([
      {
        subject_code: "MATH",
        display_name: "ریاضی",
        grades: [10],
        major_ids: [1],
        courses: [
          {
            id: 77,
            school_id: null,
            name: "ریاضی ۱",
            major_id: 1,
            grade: 10,
            category: "general",
            active: true,
            course_code: "MATH-10-G-1",
            created_at: timestamp,
            updated_at: timestamp,
          },
        ],
      },
    ]);
  };

  const repository = new ApiTeacherCoursesRepository(() => "9");
  assert.equal(requestCount, 0);
  const courseLabels = await repository.list("41");
  assert.equal(requestCount, 1);
  assert.deepEqual(courseLabels, ["ریاضی"]);

  const routeSource = await readSource("../src/routes/dashboard.teachers.tsx");
  assert.doesNotMatch(routeSource, /useCoursesRepository/);
  assert.doesNotMatch(routeSource, /مشاهده دروس|requested|setRequested/);
  assert.match(routeSource, /teacher\.status === "active"/);
});

test("Teacher dialogs map FastAPI fields and protect pending mutations", async () => {
  const validationError = new ApiError("invalid", 422, undefined, [
    { path: "name", message: "Name is required" },
    { path: "code", message: "Code is invalid" },
    { path: "phone", message: "Phone is invalid" },
  ]);
  assert.deepEqual(getTeacherFieldErrors(validationError), {
    name: "نام معلم وارد شده معتبر نیست.",
    personnel_code: "کد پرسنلی وارد شده معتبر نیست.",
    phone: "شماره تلفن باید شامل ۷ تا ۲۰ رقم باشد.",
  });
  const duplicateCode = new ApiError("Teacher code already exists.", 409, {
    error: "ConflictError",
    detail: "Teacher code already exists.",
  });
  assert.deepEqual(getTeacherFieldErrors(duplicateCode), {
    personnel_code: "کد پرسنلی وارد شده قبلاً برای معلم دیگری ثبت شده است.",
  });
  assert.equal(
    getTeacherErrorMessage(duplicateCode),
    "کد پرسنلی وارد شده قبلاً برای معلم دیگری ثبت شده است.",
  );

  const duplicatePhone = new ApiError("Conflict", 409, {
    error: "ConflictError",
    detail: "uq_teachers_active_school_phone",
  });
  assert.deepEqual(getTeacherFieldErrors(duplicatePhone), {
    phone: "شماره تلفن وارد شده قبلاً برای معلم دیگری ثبت شده است.",
  });
  assert.equal(
    getTeacherErrorMessage(duplicatePhone),
    "شماره تلفن وارد شده قبلاً برای معلم دیگری ثبت شده است.",
  );

  const ambiguousConflict = new ApiError("Teacher name, code, or phone already exists.", 409);
  assert.deepEqual(getTeacherFieldErrors(ambiguousConflict), {});
  assert.equal(
    getTeacherErrorMessage(ambiguousConflict),
    "اطلاعات وارد شده با اطلاعات موجود تداخل دارد.",
  );
  assert.match(getTeacherErrorMessage(new ApiError("limited", 429, undefined, [], 15)), /15/);

  const dialogSource = await readSource("../src/components/teachers/teacher-details-dialog.tsx");
  const routeSource = await readSource("../src/routes/dashboard.teachers.tsx");
  assert.match(dialogSource, /await submitTeacherDetails\(\(\) => onSave/);
  assert.match(dialogSource, /!isSaving && onOpenChange/);
  assert.match(dialogSource, /disabled=\{isSaving\}/);
  assert.match(dialogSource, /aria-invalid=\{Boolean\(fieldErrors\.personnel_code\)\}/);
  assert.match(dialogSource, /aria-invalid=\{Boolean\(fieldErrors\.phone\)\}/);
  assert.match(routeSource, /if \(!teacherToDelete \|\| isDeleting\) return/);
  assert.match(routeSource, /search: deferredSearch \|\| undefined/);
});

test("API mode has no Teacher mock fallback and uses school-scoped cache keys", async () => {
  const configuredSource = await readSource("../src/lib/repositories/configured.ts");
  const keysSource = await readSource("../src/lib/repository-query-keys.ts");
  assert.match(configuredSource, /teachers: \{ repository: new ApiTeacherRepository/);
  assert.match(
    configuredSource,
    /useMockApi \? await createMockRepositories\(\) : apiRepositories/,
  );
  assert.doesNotMatch(configuredSource, /catch[\s\S]{0,200}createMockRepositories/);
  assert.match(
    keysSource,
    /\["schools", schoolId \?\? "none", "teachers", teacherId, "availability"\]/,
  );
  assert.match(keysSource, /\["schools", schoolId \?\? "none", "teachers", teacherId, "courses"\]/);
});
