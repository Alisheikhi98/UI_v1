import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ApiError } from "../src/lib/api/client.ts";
import {
  XLSX_MEDIA_TYPE,
  fetchWeeklyPlanExcel,
  getExcelDownloadFilename,
  getWeeklyPlanExcelErrorMessage,
  getWeeklyPlanExcelPath,
  saveBlobAsDownload,
} from "../src/lib/api/timetable-excel.ts";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");
const xlsxBody = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

test("weekly-plan paths use the active School and selected entity IDs", () => {
  assert.equal(
    getWeeklyPlanExcelPath({ mode: "school", schoolId: "7" }),
    "/schools/7/weekly-plan.xlsx",
  );
  assert.equal(
    getWeeklyPlanExcelPath({ mode: "class", schoolId: "7", classId: "21" }),
    "/schools/7/classes/21/weekly-plan.xlsx",
  );
  assert.equal(
    getWeeklyPlanExcelPath({ mode: "teacher", schoolId: "7", teacherId: "32" }),
    "/schools/7/teachers/32/weekly-plan.xlsx",
  );
  assert.throws(() => getWeeklyPlanExcelPath({ mode: "class", schoolId: "7" }));
  assert.throws(() => getWeeklyPlanExcelPath({ mode: "teacher", schoolId: "7" }));
});

test("one authenticated response request returns a validated XLSX Blob and server filename", async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return new Response(xlsxBody, {
      headers: {
        "content-type": XLSX_MEDIA_TYPE,
        "content-disposition": 'attachment; filename="class-21-weekly-plan.xlsx"',
      },
    });
  };

  const result = await fetchWeeklyPlanExcel(
    { mode: "class", schoolId: "7", classId: "21" },
    request,
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/schools/7/classes/21/weekly-plan.xlsx");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.headers.Accept, XLSX_MEDIA_TYPE);
  assert.equal(result.filename, "class-21-weekly-plan.xlsx");
  assert.equal(result.blob.size, xlsxBody.byteLength);
});

test("download filename supports UTF-8, plain, missing, and unsafe headers", () => {
  assert.equal(
    getExcelDownloadFilename(
      "attachment; filename*=UTF-8''%D8%A8%D8%B1%D9%86%D8%A7%D9%85%D9%87.xlsx",
      "school",
    ),
    "برنامه.xlsx",
  );
  assert.equal(
    getExcelDownloadFilename('attachment; filename="teacher-4-weekly-plan.xlsx"', "teacher"),
    "teacher-4-weekly-plan.xlsx",
  );
  assert.equal(getExcelDownloadFilename(null, "class"), "chiideman-class-timetable.xlsx");
  assert.equal(
    getExcelDownloadFilename('attachment; filename="../unsafe.txt"', "school"),
    "chiideman-school-timetable.xlsx",
  );
});

test("invalid workbook responses and API failures never expose raw server text", async () => {
  await assert.rejects(
    fetchWeeklyPlanExcel({ mode: "school", schoolId: "7" }, async () =>
      Promise.resolve(
        new Response("not a workbook", { headers: { "content-type": "text/plain" } }),
      ),
    ),
    (error) => error instanceof ApiError && error.status === 502,
  );

  const raw = new ApiError("postgres internal detail", 404);
  assert.equal(getWeeklyPlanExcelErrorMessage(raw), "برنامه هفتگی برای دانلود در دسترس نیست.");
  assert.doesNotMatch(getWeeklyPlanExcelErrorMessage(raw), /postgres/i);
  assert.equal(
    getWeeklyPlanExcelErrorMessage(new ApiError("fetch failed", 0)),
    "ارتباط با سرور برقرار نشد.",
  );
  assert.equal(
    getWeeklyPlanExcelErrorMessage(new ApiError("raw", 401)),
    "نشست شما منقضی شده است. دوباره وارد شوید.",
  );
  assert.equal(
    getWeeklyPlanExcelErrorMessage(new ApiError("raw", 403)),
    "اجازه دانلود فایل Excel را ندارید.",
  );
  assert.equal(
    getWeeklyPlanExcelErrorMessage(new ApiError("raw", 422)),
    "اطلاعات لازم برای دانلود فایل Excel معتبر نیست.",
  );
  assert.equal(
    getWeeklyPlanExcelErrorMessage(new ApiError("raw", 500)),
    "دانلود فایل Excel انجام نشد. دوباره تلاش کنید.",
  );
});

test("browser download clicks once and always revokes its temporary object URL", () => {
  const originalDocument = globalThis.document;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const events = [];
  const anchor = {
    hidden: false,
    href: "",
    download: "",
    click: () => events.push("click"),
    remove: () => events.push("remove"),
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: () => anchor,
      body: { append: () => events.push("append") },
    },
  });
  URL.createObjectURL = () => "blob:test-workbook";
  URL.revokeObjectURL = (url) => events.push(`revoke:${url}`);

  try {
    saveBlobAsDownload(new Blob([xlsxBody], { type: XLSX_MEDIA_TYPE }), "weekly.xlsx");
    assert.equal(anchor.download, "weekly.xlsx");
    assert.deepEqual(events, ["append", "click", "remove", "revoke:blob:test-workbook"]);
  } finally {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test("download integration preserves auth recovery, guards duplicate clicks, and releases Blob URLs", async () => {
  const [client, route, utility, packageJson] = await Promise.all([
    readSource("../src/lib/api/client.ts"),
    readSource("../src/routes/dashboard.timetable.tsx"),
    readSource("../src/lib/api/timetable-excel.ts"),
    readSource("../package.json"),
  ]);

  assert.match(client, /headers\.set\("Authorization", `Bearer \$\{token\}`\)/);
  assert.match(client, /api:unauthorized/);
  assert.match(client, /contentType\.includes\("application\/json"\)/);
  assert.match(route, /useActiveSchoolId\(\)/);
  assert.match(route, /exportInFlight\.current/);
  assert.match(route, /setExportPending\(format\)/);
  assert.match(route, /setExportPending\(null\)/);
  assert.match(route, /mode === "class" && !selectedClassId/);
  assert.match(route, /mode === "teacher" && !selectedTeacherId/);
  assert.match(utility, /URL\.createObjectURL/);
  assert.match(utility, /URL\.revokeObjectURL/);
  assert.match(route, /getWeeklyPlanExcelErrorMessage\(error\)/);
  assert.match(route, /await printTimetablePdf\(exportModel\)/);
  assert.doesNotMatch(packageJson, /write-excel-file/);
});
