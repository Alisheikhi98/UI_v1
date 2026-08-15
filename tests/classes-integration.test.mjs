import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";

process.env.VITE_API_BASE_URL = "http://classes.test";

const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
  dispatchEvent: () => true,
};

const [{ setAccessToken, clearAccessToken }, repositoriesModule, clientModule, selectorsModule] =
  await Promise.all([
    import("../src/lib/auth-token.ts"),
    import("../src/lib/api/api-repositories.ts"),
    import("../src/lib/api/client.ts"),
    import("../src/lib/class-management-selectors.ts"),
  ]);

const { ApiClassRepository, ApiCourseRepository, ApiMajorRepository, ApiTeacherRepository } =
  repositoriesModule;
const { ApiError } = clientModule;
const { getMajorDisplayName, selectClassViewModels, selectMajorOptions } = selectorsModule;
const {
  getAssignmentErrorMessage,
  getClassDeleteErrorMessage,
  getClassErrorMessage,
  getClassFieldErrors,
  getCourseErrorMessage,
  getCourseFieldErrors,
} = await import("../src/lib/class-errors.ts");
const { ClassAssignmentPartialFailureError } =
  await import("../src/lib/api/class-assignment-reconciliation.ts");
const { getTeacherFieldErrors, getTeacherErrorMessage, submitTeacherDetails } =
  await import("../src/lib/teacher-errors.ts");
const { selectCreatedTeacherInDraft } = await import("../src/lib/class-assignment-draft.ts");
const { MutationObserver, QueryClient } = await import("@tanstack/react-query");

setAccessToken("classes-test-token");
const originalFetch = globalThis.fetch;

after(() => {
  globalThis.fetch = originalFetch;
  clearAccessToken();
  delete globalThis.window;
});

const timestamp = "2026-08-03T10:00:00Z";
const classDto = (overrides = {}) => ({
  id: 101,
  school_id: 9,
  major_id: 27,
  name: "دهم تجربی الف",
  grade: 10,
  active: true,
  created_at: timestamp,
  updated_at: timestamp,
  ...overrides,
});

test("Majors load from the authenticated API and use code only for localization", async () => {
  let observedAuthorization = null;
  globalThis.fetch = async (input, init = {}) => {
    assert.equal(new URL(String(input)).pathname, "/majors/");
    observedAuthorization = new Headers(init.headers).get("Authorization");
    return Response.json([
      { id: 27, code: "EXP", name: "Experimental Sciences", active: true },
      { id: 91, code: "future", name: "رشته آینده", active: true },
    ]);
  };

  const majors = await new ApiMajorRepository().list();

  assert.deepEqual(
    majors.map((major) => major.id),
    ["27", "91"],
  );
  assert.deepEqual(selectMajorOptions(majors), [
    { value: "27", label: "علوم تجربی" },
    { value: "91", label: "رشته آینده" },
  ]);
  assert.equal(getMajorDisplayName(majors[0]), "علوم تجربی");
  assert.equal(getMajorDisplayName(majors[1]), "رشته آینده");
  assert.equal(observedAuthorization, "Bearer classes-test-token");

  const view = selectClassViewModels(
    [
      {
        id: "101",
        name: "دهم تجربی الف",
        gradeId: "10",
        majorId: "27",
        studentCapacity: 0,
      },
    ],
    majors,
  );
  assert.equal(view[0].majorName, "علوم تجربی");
});

test("Class CRUD uses the school scope, FastAPI DTOs, refetched state, and server IDs", async () => {
  const requests = [];
  let classes = [];
  let nextId = 700;

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : null;
    requests.push({ url, method, body });

    if (url.pathname === "/schools/9/classes/" && method === "GET") {
      return Response.json({ items: classes, page: 1, size: 25, total: classes.length, pages: 1 });
    }
    if (url.pathname === "/schools/9/classes/" && method === "POST") {
      const created = classDto({ id: ++nextId, ...body });
      classes.push(created);
      return Response.json(created, { status: 201 });
    }

    const match = url.pathname.match(/^\/schools\/9\/classes\/(\d+)$/);
    if (match && method === "PATCH") {
      const id = Number(match[1]);
      classes = classes.map((item) => (item.id === id ? { ...item, ...body } : item));
      return Response.json(classes.find((item) => item.id === id));
    }
    if (url.pathname.endsWith("/delete-check") && method === "GET") {
      return Response.json({ can_delete: true, dependencies: {}, message: null });
    }
    if (match && method === "DELETE") {
      const id = Number(match[1]);
      const deleted = classes.find((item) => item.id === id);
      classes = classes.filter((item) => item.id !== id);
      return Response.json({ ...deleted, active: false });
    }
    return Response.json({ detail: "Not found" }, { status: 404 });
  };

  const repository = new ApiClassRepository(() => "9");
  const created = await repository.create({ name: "دهم تجربی الف", gradeId: "10", majorId: "27" });
  assert.equal(created.id, "701");
  assert.deepEqual(requests[0].body, { name: "دهم تجربی الف", grade: 10, major_id: 27 });

  const listed = await repository.list({ page: 1, pageSize: 25 });
  assert.equal(listed.items[0].id, created.id);
  assert.equal(listed.items[0].majorId, "27");
  assert.equal(requests[1].url.searchParams.get("page"), "1");
  assert.equal(requests[1].url.searchParams.get("size"), "25");

  const renamed = await repository.update(created.id, { name: "دهم تجربی ب" });
  assert.equal(renamed.id, created.id);
  assert.deepEqual(requests[2].body, { name: "دهم تجربی ب" });

  await repository.delete(created.id);
  assert.equal((await repository.list()).items.length, 0);
  assert.deepEqual(
    requests.slice(3, 5).map(({ method, url }) => `${method} ${url.pathname}`),
    ["GET /schools/9/classes/701/delete-check", "DELETE /schools/9/classes/701"],
  );
});

test("Course creation sends only supported fields and reloads compatible Courses", async () => {
  const requests = [];
  const createdCourse = {
    id: 801,
    school_id: 9,
    name: "زیست‌شناسی",
    major_id: 27,
    grade: 10,
    category: "specialized",
    active: true,
    course_code: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : null;
    requests.push({ url, method, body });
    if (url.pathname === "/schools/9/courses" && method === "POST") {
      return Response.json(createdCourse, { status: 201 });
    }
    if (url.pathname === "/schools/9/classes/101/courses" && method === "GET") {
      return Response.json([createdCourse]);
    }
    return Response.json([]);
  };

  const repository = new ApiCourseRepository(() => "9");
  const created = await repository.create({
    name: "زیست‌شناسی",
    gradeId: "10",
    majorId: "27",
    category: "specialized",
    active: true,
  });
  const compatible = await repository.list({ filters: { classId: "101" } });

  assert.equal(created.id, "801");
  assert.equal(compatible.items[0].id, created.id);
  assert.deepEqual(requests[0].body, {
    name: "زیست‌شناسی",
    major_id: 27,
    grade: 10,
    category: "specialized",
  });
  assert.equal("active" in requests[0].body, false);
});

test("Class validation maps FastAPI 422 fields and common HTTP errors", () => {
  const validationError = new ApiError("Invalid class", 422, undefined, [
    { path: "name", message: "String should have at least 1 character" },
    { path: "major_id", message: "Input should be greater than 0" },
    { path: "grade", message: "Input should be less than or equal to 12" },
  ]);
  assert.deepEqual(getClassFieldErrors(validationError), {
    name: "نام کلاس وارد شده معتبر نیست.",
    majorId: "رشته تحصیلی انتخاب شده معتبر نیست.",
    gradeId: "پایه تحصیلی انتخاب شده معتبر نیست.",
  });
  assert.equal(
    getClassErrorMessage(new ApiError("missing", 404)),
    "کلاس موردنظر در این مدرسه پیدا نشد.",
  );
  assert.match(getClassErrorMessage(new ApiError("limited", 429)), /بیش از حد مجاز/);
});

test("Classes domain errors are localized without exposing server details", async () => {
  const rawServerMessage =
    'duplicate key value violates unique constraint "uq_private_database_constraint"';
  const conflict = new ApiError(rawServerMessage, 409, {
    detail: rawServerMessage,
    statement: "INSERT INTO private_table",
  });
  const validation = new ApiError(rawServerMessage, 422, undefined, [
    { path: "name", message: rawServerMessage },
  ]);
  const partialFailure = new ClassAssignmentPartialFailureError(conflict, []);

  assert.equal(getClassErrorMessage(conflict), "اطلاعات کلاس با اطلاعات موجود تداخل دارد.");
  assert.equal(
    getClassDeleteErrorMessage(conflict),
    "کلاس به دلیل وابستگی‌های موجود قابل حذف نیست.",
  );
  assert.equal(getCourseErrorMessage(conflict), "این درس قبلاً برای کلاس ثبت شده است.");
  assert.deepEqual(getCourseFieldErrors(validation), {
    name: "نام درس وارد شده معتبر نیست.",
  });
  assert.equal(
    getAssignmentErrorMessage(partialFailure),
    "ذخیره تنظیمات کلاس با اطلاعات موجود تداخل دارد.",
  );

  const displayedMessages = [
    getClassErrorMessage(conflict),
    getClassDeleteErrorMessage(conflict),
    getCourseErrorMessage(conflict),
    getAssignmentErrorMessage(partialFailure),
  ];
  displayedMessages.forEach((message) => {
    assert.doesNotMatch(message, /duplicate key|constraint|INSERT|private_table/i);
  });

  const [routeSource, dialogSource] = await Promise.all([
    readFile(new URL("../src/routes/dashboard.classes.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/components/classes/class-assignments-sheet.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  assert.doesNotMatch(routeSource, /error\.message/);
  assert.doesNotMatch(
    dialogSource,
    /error\.message|error\.cause\.message|assignmentsError\?\.message/,
  );
  assert.match(dialogSource, /ممکن است بخشی از تغییرات ذخیره شده باشد/);
  assert.match(dialogSource, /getAssignmentErrorMessage\(error\)/);
  assert.match(dialogSource, /getCourseErrorMessage\(error\)/);
  assert.match(routeSource, /getClassDeleteErrorMessage\(error\)/);
  assert.match(dialogSource, /catch \(error\)[\s\S]{0,250}setFieldError/);
});

test("API-mode Classes composition never falls back to mutable mock entities", async () => {
  const [configuredSource, managementSource, routeSource] = await Promise.all([
    readFile(new URL("../src/lib/repositories/configured.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/class-management.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/dashboard.classes.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(configuredSource, /majors:\s*\{ repository: new ApiMajorRepository\(\) \}/);
  assert.match(managementSource, /useMajorsRepository/);
  assert.doesNotMatch(managementSource, /mock-repositor/i);
  assert.doesNotMatch(routeSource, /mock-repositor/i);
  assert.doesNotMatch(routeSource, /major-[123]/);
});

test("incomplete assignment drafts stay neutral until Save is attempted", async () => {
  const [routeSource, dialogSource] = await Promise.all([
    readFile(new URL("../src/routes/dashboard.classes.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/components/classes/class-assignments-sheet.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.doesNotMatch(routeSource, /درس ناقص|incompleteCourseCount/);
  assert.doesNotMatch(dialogSource, /درس ناقص/);
  assert.match(dialogSource, /setShowValidationErrors\(true\)/);
  assert.match(dialogSource, /showValidationErrors && !assignment\.courseId/);
  assert.doesNotMatch(dialogSource, /disabled=\{[^}]*!draftIsValid/);
});

test("Class Management reuses localized Teacher field errors for create and edit", async () => {
  const duplicateCode = new ApiError("Conflict", 409, {
    detail: "uq_teachers_active_school_code",
  });
  const duplicatePhone = new ApiError("Conflict", 409, {
    detail: "uq_teachers_active_school_phone",
  });
  const genericConflict = new ApiError("Teacher already exists", 409);
  const validationError = new ApiError("Request validation failed", 422, undefined, [
    { path: "code", message: "raw personnel validation" },
    { path: "phone", message: "raw phone validation" },
  ]);

  assert.deepEqual(getTeacherFieldErrors(duplicateCode), {
    personnel_code: "کد پرسنلی وارد شده قبلاً برای معلم دیگری ثبت شده است.",
  });
  assert.deepEqual(getTeacherFieldErrors(duplicatePhone), {
    phone: "شماره تلفن وارد شده قبلاً برای معلم دیگری ثبت شده است.",
  });
  assert.deepEqual(getTeacherFieldErrors(validationError), {
    personnel_code: "کد پرسنلی وارد شده معتبر نیست.",
    phone: "شماره تلفن باید شامل ۷ تا ۲۰ رقم باشد.",
  });
  assert.deepEqual(getTeacherFieldErrors(genericConflict), {});
  assert.equal(
    getTeacherErrorMessage(genericConflict),
    "اطلاعات وارد شده با اطلاعات موجود تداخل دارد.",
  );
  assert.doesNotMatch(getTeacherErrorMessage(genericConflict), /Teacher|Conflict|PostgreSQL/i);

  const [classDialogSource, sharedDialogSource] = await Promise.all([
    readFile(
      new URL("../src/components/classes/class-assignments-sheet.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/components/teachers/teacher-details-dialog.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  const teacherDialogs = classDialogSource.slice(
    classDialogSource.indexOf("<TeacherDetailsDialog"),
    classDialogSource.indexOf("<AlertDialog open={confirmCloseOpen}"),
  );

  assert.equal(teacherDialogs.match(/<TeacherDetailsDialog/g)?.length, 2);
  assert.match(teacherDialogs, /description: getTeacherErrorMessage\(error\)/);
  assert.doesNotMatch(teacherDialogs, /description:\s*error\.message/);
  assert.match(sharedDialogSource, /await submitTeacherDetails/);
  assert.match(sharedDialogSource, /aria-invalid=\{Boolean\(fieldErrors\.personnel_code\)\}/);
  assert.match(sharedDialogSource, /aria-invalid=\{Boolean\(fieldErrors\.phone\)\}/);
  assert.doesNotMatch(
    sharedDialogSource.slice(
      sharedDialogSource.indexOf("} else {", sharedDialogSource.indexOf("submitTeacherDetails")),
      sharedDialogSource.indexOf("} finally"),
    ),
    /setFormData|onOpenChange\(false\)/,
  );
});

test("inline create propagates duplicate API errors through mutateAsync into dialog state", async () => {
  const repository = new ApiTeacherRepository(() => "9");
  const queryClient = new QueryClient();
  const formValues = {
    name: "معلم آزمایشی",
    personnel_code: "DUP-101",
    phone: "09121234567",
  };
  let selectedTeacherId = null;
  let successCount = 0;
  let dialogOpen = true;

  globalThis.fetch = async (_input, init = {}) => {
    assert.equal(init.method, "POST");
    return Response.json(
      { error: "ConflictError", detail: "Teacher code already exists." },
      { status: 409 },
    );
  };
  const createMutation = new MutationObserver(queryClient, {
    mutationFn: (input) => repository.create(input),
  });
  const codeResult = await submitTeacherDetails(async () => {
    const created = await createMutation.mutate(formValues);
    selectedTeacherId = created.id;
    successCount += 1;
  });

  if (codeResult.ok) dialogOpen = false;
  assert.deepEqual(codeResult, {
    ok: false,
    fieldErrors: {
      personnel_code: "کد پرسنلی وارد شده قبلاً برای معلم دیگری ثبت شده است.",
    },
    formError: null,
  });
  assert.equal(dialogOpen, true);
  assert.deepEqual(formValues, {
    name: "معلم آزمایشی",
    personnel_code: "DUP-101",
    phone: "09121234567",
  });
  assert.equal(selectedTeacherId, null);
  assert.equal(successCount, 0);
  assert.equal(createMutation.getCurrentResult().isPending, false);

  globalThis.fetch = async () =>
    Response.json(
      { error: "ConflictError", detail: "Teacher phone already exists." },
      { status: 409 },
    );
  const phoneResult = await submitTeacherDetails(async () => {
    const created = await createMutation.mutate(formValues);
    selectedTeacherId = created.id;
    successCount += 1;
  });
  assert.deepEqual(phoneResult, {
    ok: false,
    fieldErrors: {
      phone: "شماره تلفن وارد شده قبلاً برای معلم دیگری ثبت شده است.",
    },
    formError: null,
  });
  assert.equal(selectedTeacherId, null);
  assert.equal(successCount, 0);
});

test("inline edit preserves values and renders duplicate and validation errors", async () => {
  const repository = new ApiTeacherRepository(() => "9");
  const queryClient = new QueryClient();
  const editValues = {
    name: "معلم ویرایش‌شده",
    personnel_code: "EDIT-409",
    phone: "09129876543",
  };
  let successCount = 0;

  globalThis.fetch = async (_input, init = {}) => {
    assert.equal(init.method, "PATCH");
    return Response.json(
      { error: "ConflictError", detail: "Teacher phone already exists." },
      { status: 409 },
    );
  };
  const updateMutation = new MutationObserver(queryClient, {
    mutationFn: (input) => repository.update("41", input),
  });
  const conflictResult = await submitTeacherDetails(async () => {
    await updateMutation.mutate(editValues);
    successCount += 1;
  });
  assert.deepEqual(conflictResult, {
    ok: false,
    fieldErrors: {
      phone: "شماره تلفن وارد شده قبلاً برای معلم دیگری ثبت شده است.",
    },
    formError: null,
  });
  assert.equal(successCount, 0);
  assert.equal(updateMutation.getCurrentResult().isPending, false);
  assert.equal(editValues.phone, "09129876543");

  globalThis.fetch = async () =>
    Response.json(
      {
        detail: [{ loc: ["body", "code"], msg: "raw code validation", type: "value_error" }],
      },
      { status: 422 },
    );
  const validationResult = await submitTeacherDetails(() => updateMutation.mutate(editValues));
  assert.deepEqual(validationResult, {
    ok: false,
    fieldErrors: { personnel_code: "کد پرسنلی وارد شده معتبر نیست." },
    formError: null,
  });

  globalThis.fetch = async () =>
    Response.json(
      { error: "ConflictError", detail: "Teacher name, code, or phone already exists." },
      { status: 409 },
    );
  const genericResult = await submitTeacherDetails(() => updateMutation.mutate(editValues));
  assert.deepEqual(genericResult, {
    ok: false,
    fieldErrors: {},
    formError: "اطلاعات وارد شده با اطلاعات موجود تداخل دارد.",
  });

  const [dialogSource, queryHooksSource] = await Promise.all([
    readFile(
      new URL("../src/components/teachers/teacher-details-dialog.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/lib/mock-queries.ts", import.meta.url), "utf8"),
  ]);
  assert.match(dialogSource, /\{fieldErrors\.personnel_code\}/);
  assert.match(dialogSource, /\{fieldErrors\.phone\}/);
  assert.match(dialogSource, /setFieldErrors\(result\.fieldErrors\)/);
  assert.match(dialogSource, /finally \{\s*setIsSaving\(false\)/);
  assert.match(dialogSource, /\[open, teacherName, teacherPersonnelCode, teacherPhone\]/);
  assert.doesNotMatch(dialogSource, /\[teacher, open\]/);
  assert.match(queryHooksSource, /create:\s*create\.mutateAsync/);
  assert.match(queryHooksSource, /update:\s*update\.mutateAsync/);
  assert.doesNotMatch(
    dialogSource.slice(
      dialogSource.indexOf("const result = await submitTeacherDetails"),
      dialogSource.indexOf("} finally"),
    ),
    /setFormData/,
  );
});

test("inline Teacher creation selects the server ID only after success", async () => {
  const draft = [
    {
      draftId: "row-1",
      classId: "101",
      courseId: "801",
      teacherId: "",
      weeklyPeriods: 3,
    },
    {
      draftId: "row-2",
      classId: "101",
      courseId: "802",
      teacherId: "41",
      weeklyPeriods: 2,
    },
  ];

  const selected = selectCreatedTeacherInDraft(draft, "row-1", "server-teacher-907");
  assert.equal(selected[0].teacherId, "server-teacher-907");
  assert.equal(selected[1].teacherId, "41");
  assert.notEqual(selected[0], draft[0]);
  assert.equal(selected[1], draft[1]);

  let failedDraft = draft;
  await assert.rejects(async () => {
    const createdTeacher = await Promise.reject(new ApiError("Teacher code exists", 409));
    failedDraft = selectCreatedTeacherInDraft(failedDraft, "row-1", createdTeacher.id);
  });
  assert.equal(failedDraft, draft);

  const [classDialogSource, routeSource] = await Promise.all([
    readFile(
      new URL("../src/components/classes/class-assignments-sheet.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/routes/dashboard.classes.tsx", import.meta.url), "utf8"),
  ]);
  const createTeacherStart = classDialogSource.indexOf(
    "const createdTeacher = await onCreateTeacher",
  );
  const selectTeacherStart = classDialogSource.indexOf(
    "selectCreatedTeacherInDraft",
    createTeacherStart,
  );
  const successStart = classDialogSource.indexOf(
    'toast.success("معلم جدید ایجاد شد")',
    createTeacherStart,
  );
  assert.ok(createTeacherStart >= 0 && selectTeacherStart > createTeacherStart);
  assert.ok(successStart > selectTeacherStart);
  assert.match(
    routeSource,
    /onCreateTeacher=\{async \(teacher\) => \{\s*return teachersRepository\.create\(teacher\)/,
  );
});
