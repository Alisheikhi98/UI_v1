import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

describe("shared RTL visual primitives", () => {
  test("search inputs reserve logical start space for a non-interactive icon", async () => {
    const source = await readSource("../src/components/ui/search-input.tsx");
    expect(source).toContain("pointer-events-none absolute start-3");
    expect(source).toContain('className={cn("ps-9 pe-3", className)}');

    const consumers = await Promise.all(
      [
        "../src/routes/dashboard.classes.tsx",
        "../src/routes/dashboard.subjects.tsx",
        "../src/routes/dashboard.teachers.tsx",
        "../src/components/timetable/weekly-timetable-toolbar.tsx",
        "../src/components/classes/class-assignments-sheet.tsx",
      ].map(readSource),
    );
    for (const consumer of consumers) {
      expect(consumer).toContain("SearchInput");
      expect(consumer).not.toMatch(/<Search className="absolute (?:left|right)-/);
    }
  });

  test("dialog close controls and headers reserve the RTL inline end", async () => {
    const dialog = await readSource("../src/components/ui/dialog.tsx");
    expect(dialog).toContain("absolute end-4 top-4 z-10");
    expect(dialog).toContain("space-y-1.5 pe-10 text-start");
    expect(dialog).toContain("w-[calc(100%-2rem)]");
    expect(dialog).not.toContain("absolute right-4 top-4");

    const classDialog = await readSource("../src/components/classes/class-assignments-sheet.tsx");
    expect(classDialog).toContain("px-12 pe-12");
    expect(classDialog).toContain("sm:px-14 sm:pe-14");
  });

  test("password visibility controls cannot overlap entered text", async () => {
    for (const path of ["../src/routes/auth.login.tsx", "../src/routes/auth.register.tsx"]) {
      const source = await readSource(path);
      expect(source).toContain('className="pe-10"');
      expect(source).toContain('className="absolute end-0 top-0 h-full px-3');
      expect(source).not.toContain('className="absolute left-0 top-0 h-full px-3');
    }
  });

  test("switch thumb movement mirrors correctly in RTL", async () => {
    const source = await readSource("../src/components/ui/switch.tsx");
    expect(source).toContain("rtl:data-[state=checked]:-translate-x-4");
    expect(source).toContain("data-[state=checked]:bg-primary");
    expect(source).toContain("data-[state=unchecked]:bg-input");
  });

  test("select, menu, alert, and table primitives use logical alignment", async () => {
    const [select, menu, alert, table] = await Promise.all([
      readSource("../src/components/ui/select.tsx"),
      readSource("../src/components/ui/dropdown-menu.tsx"),
      readSource("../src/components/ui/alert.tsx"),
      readSource("../src/components/ui/table.tsx"),
    ]);
    expect(select).toContain("pe-2 ps-8 text-start");
    expect(select).toContain("absolute start-2");
    expect(menu).toContain("ms-auto rtl:rotate-180");
    expect(menu).toContain("absolute start-2");
    expect(alert).toContain("[&>svg]:start-4");
    expect(alert).toContain("[&>svg~*]:ps-7");
    expect(table).toContain("text-start");
    expect(table).toContain("[&:has([role=checkbox])]:pe-0");
  });
});
