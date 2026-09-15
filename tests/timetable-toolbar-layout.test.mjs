import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const [source, actions, route, styles] = await Promise.all([
  readFile(
    fileURLToPath(
      new URL("../src/components/timetable/weekly-timetable-toolbar.tsx", import.meta.url),
    ),
    "utf8",
  ),
  readFile(
    fileURLToPath(
      new URL("../src/components/timetable/timetable-page-actions.tsx", import.meta.url),
    ),
    "utf8",
  ),
  readFile(
    fileURLToPath(new URL("../src/routes/dashboard.timetable.tsx", import.meta.url)),
    "utf8",
  ),
  readFile(fileURLToPath(new URL("../src/styles.css", import.meta.url)), "utf8"),
]);

test("filters precede compact Class search while page actions sit beside History", () => {
  assert.match(source, /timetable-toolbar-primary flex flex-col gap-3 xl:flex-row xl:items-center/);
  assert.match(
    source,
    /md:grid-cols-\[minmax\(10rem,11rem\)_minmax\(12rem,13rem\)_minmax\(10rem,12rem\)_auto\]/,
  );
  assert.match(source, /timetable-context-controls[^\"]*xl:justify-center/);
  assert.match(source, /timetable-toolbar-filters mx-auto[^\"]*max-w-3xl[^\"]*md:justify-center/);
  assert.equal(source.match(/max-w-xs items-center/g)?.length, 2);
  assert.equal(source.match(/\[&>span\]:text-center/g)?.length, 4);
  assert.ok(source.indexOf("timetable-grade-filter") < source.indexOf("timetable-major-filter"));
  assert.ok(source.indexOf("timetable-major-filter") < source.indexOf("timetable-class-search"));
  assert.doesNotMatch(source, /timetable-toolbar-actions|onFullscreenToggle|onExport/);

  assert.match(actions, /نمایش تمام صفحه/);
  assert.match(actions, /چاپ برنامه/);
  assert.match(actions, /دانلود PDF/);
  assert.match(actions, /دانلود Excel/);
  assert.ok(route.indexOf("تاریخچه برنامه‌ها") < route.indexOf("<TimetablePageActions"));
  assert.match(route, /sm:flex-row sm:flex-wrap sm:items-center sm:justify-end/);
  assert.match(styles, /\.timetable-toolbar-filters\s*\{[^}]*flex-wrap: nowrap;/s);
});
