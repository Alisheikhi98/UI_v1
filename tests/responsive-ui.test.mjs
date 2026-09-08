import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const readSource = async (relativePath) =>
  (await readFile(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8")).replaceAll(
    "\r\n",
    "\n",
  );

test("mobile dashboard navigation is off-canvas, accessible, and closes after navigation", async () => {
  const source = await readSource("../src/components/sidebar.tsx");
  assert.match(source, /aria-label=\{mobileMenuOpen \? "بستن منوی اصلی" : "باز کردن منوی اصلی"\}/);
  assert.match(source, /aria-expanded=\{mobileMenuOpen\}/);
  assert.match(source, /h-11 w-11/);
  assert.match(source, /w-\[min\(18rem,calc\(100vw-1\.5rem\)\)\]/);
  assert.match(source, /onClick=\{\(\) => setMobileMenuOpen\(false\)\}/);
  assert.match(source, /z-\[60\].*bg-black\/50/);
  assert.match(source, /z-\[70\].*h-dvh/);
  assert.match(source, /z-\[80\].*lg:hidden/);
  assert.match(source, /document\.body\.style\.overflow = "hidden"/);
});

test("desktop and mobile Sidebar share the Schools, Classes, Teachers navigation order", async () => {
  const source = await readSource("../src/components/sidebar.tsx");
  const navigationSource = source.match(/const navigation = \[(.*?)\];/s)?.[1] ?? "";
  const entries = [...navigationSource.matchAll(/name: "([^"]+)", href: "([^"]+)"/g)].map(
    ([, name, href]) => ({ name, href }),
  );
  const schoolsIndex = entries.findIndex((item) => item.name === "مدرسه");
  const classesIndex = entries.findIndex((item) => item.name === "کلاس‌ها");
  const teachersIndex = entries.findIndex((item) => item.name === "معلمان");

  assert.ok(schoolsIndex < classesIndex);
  assert.ok(classesIndex < teachersIndex);
  assert.deepEqual(entries.slice(schoolsIndex, teachersIndex + 1), [
    { name: "مدرسه", href: "/dashboard/schools" },
    { name: "کلاس‌ها", href: "/dashboard/classes" },
    { name: "معلمان", href: "/dashboard/teachers" },
  ]);
  assert.equal(source.match(/navigation\.map/g)?.length, 1);
  assert.match(source, /pathname === item\.href/);
  assert.match(source, /pathname\.startsWith\(item\.href\)/);
  assert.match(source, /onClick=\{\(\) => setMobileMenuOpen\(false\)\}/);
});

test("dashboard headers reserve mobile menu space and allow descriptions to grow", async () => {
  const source = await readSource("../src/components/header.tsx");
  assert.match(source, /min-h-16/);
  assert.match(source, /ps-16/);
  assert.match(source, /min-w-0 flex-1/);
  assert.doesNotMatch(source, /flex h-16 items-center/);
});

test("shared overlays and floating controls stay within the mobile viewport", async () => {
  const dialog = await readSource("../src/components/ui/dialog.tsx");
  const alertDialog = await readSource("../src/components/ui/alert-dialog.tsx");
  const dropdown = await readSource("../src/components/ui/dropdown-menu.tsx");
  const popover = await readSource("../src/components/ui/popover.tsx");
  const select = await readSource("../src/components/ui/select.tsx");
  for (const source of [dialog, alertDialog]) {
    assert.match(source, /max-h-\[calc\(100dvh-2rem\)\]/);
    assert.match(source, /w-\[calc\(100%-2rem\)\]/);
    assert.match(source, /overflow-y-auto/);
  }
  for (const source of [dropdown, popover, select]) {
    assert.match(source, /max-w-\[calc\(100vw-1rem\)\]/);
  }
});

test("Teachers uses mobile cards while preserving the desktop table", async () => {
  const source = await readSource("../src/routes/dashboard.teachers.tsx");
  assert.match(source, /data-testid="teachers-mobile-list"/);
  assert.match(source, /grid gap-3 md:hidden/);
  assert.match(source, /hidden overflow-hidden md:block/);
  assert.match(source, /<TeacherCoursesCell teacher=\{teacher\} \/>/);
  assert.match(source, /روزهای حضور/);
});

test("wide scheduling surfaces scroll locally and mobile controls wrap without shrinking content", async () => {
  const master = await readSource("../src/components/timetable/school-master-timetable.tsx");
  const entity = await readSource("../src/components/timetable/entity-timetable.tsx");
  const preview = await readSource("../src/components/generator/timetable-preview.tsx");
  const actions = await readSource("../src/components/timetable/timetable-page-actions.tsx");
  assert.match(master, /timetable-scroll[^"]*overflow-auto/);
  assert.match(entity, /timetable-scroll[^"]*overflow-auto/);
  assert.match(preview, /w-full overflow-auto/);
  assert.match(actions, /grid grid-cols-2 gap-2 sm:flex/);
  assert.match(actions, /col-span-2 sm:col-auto/);
});

test("mobile landscape gives the timetable one touch scroller and compact sticky context", async () => {
  const [route, fullscreen, master, entity, toolbar, actions, styles] = await Promise.all([
    readSource("../src/routes/dashboard.timetable.tsx"),
    readSource("../src/components/timetable/fullscreen-timetable-overview.tsx"),
    readSource("../src/components/timetable/school-master-timetable.tsx"),
    readSource("../src/components/timetable/entity-timetable.tsx"),
    readSource("../src/components/timetable/weekly-timetable-toolbar.tsx"),
    readSource("../src/components/timetable/timetable-page-actions.tsx"),
    readSource("../src/styles.css"),
  ]);

  assert.match(route, /<FullscreenTimetableOverview/);
  assert.match(fullscreen, /fixed inset-0 z-\[100\]/);
  assert.match(fullscreen, /h-dvh w-screen/);
  assert.match(fullscreen, /fullscreen-timetable-viewport timetable-scroll/);
  assert.match(fullscreen, /overflow-auto overscroll-contain/);
  assert.match(fullscreen, /sm:hidden/);
  assert.match(master, /timetable-sticky-day/);
  assert.match(master, /timetable-sticky-period/);
  assert.match(entity, /timetable-sticky-entity-period/);
  assert.match(toolbar, /timetable-toolbar-primary/);
  assert.match(actions, /timetable-toolbar-actions/);
  assert.match(toolbar, /timetable-context-controls/);
  assert.match(styles, /orientation: landscape/);
  assert.match(styles, /max-width: 950px/);
  assert.match(styles, /max-height: 500px/);
  assert.match(styles, /-webkit-overflow-scrolling: touch/);
  assert.match(styles, /overscroll-behavior: contain/);
  assert.match(styles, /touch-action: pan-x pan-y/);
  assert.match(styles, /\.timetable-sticky-period\s*\{[^}]*right: 4rem/s);
  assert.match(styles, /@media \(max-width: 639px\)/);
  assert.match(styles, /\.timetable-sticky-period\s*\{[^}]*width: 3rem/s);
  assert.match(toolbar, /xl:flex-row xl:items-center/);
  assert.match(styles, /\.timetable-toolbar-filters\s*\{[^}]*flex-wrap: nowrap;/s);
  assert.match(styles, /html\.timetable-fullscreen-active #mobile-dashboard-menu-trigger/);
});

test("landing page keeps a readable responsive product flow without horizontal overflow", async () => {
  const source = await readSource("../src/routes/index.tsx");
  assert.match(source, /overflow-x-clip/);
  assert.match(source, /text-4xl font-black[^"]*sm:text-5xl lg:text-6xl/);
  assert.match(source, /py-14[^"]*sm:py-20[^"]*lg:py-24/);
  assert.match(source, /grid w-full max-w-5xl gap-4 md:grid-cols-3/);
  assert.match(source, /flex flex-col gap-3 sm:flex-row/);
});

test("responsive fixes do not mask global overflow at the document level", async () => {
  const styles = await readSource("../src/styles.css");
  assert.doesNotMatch(styles, /body\s*\{[^}]*overflow-x\s*:\s*hidden/s);
  assert.doesNotMatch(styles, /html\s*\{[^}]*overflow-x\s*:\s*hidden/s);
});
