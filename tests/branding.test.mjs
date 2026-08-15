import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import { APP_NAME, APP_NAME_EN, withAppName } from "../src/lib/branding.ts";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");
const oldBrandVariants = [
  "آموزش‌یار",
  "آموزش یار",
  "آموزشیار",
  "Amoozeshyar",
  "AmoozeshYar",
  "amoozeshyar",
  "AMOOZESHYAR",
];

describe("Chideman product branding", () => {
  test("exposes one canonical Persian and English product name", () => {
    expect(APP_NAME).toBe("چیدمان");
    expect(APP_NAME_EN).toBe("Chideman");
    expect(withAppName("ورود")).toBe("چیدمان | ورود");
  });

  test("Sidebar and Authentication use the canonical brand", async () => {
    const [sidebar, login, register, forgotPassword] = await Promise.all([
      readSource("../src/components/sidebar.tsx"),
      readSource("../src/routes/auth.login.tsx"),
      readSource("../src/routes/auth.register.tsx"),
      readSource("../src/routes/auth.forgot-password.tsx"),
    ]);

    expect(sidebar).toContain("{APP_NAME}");
    expect(login).toContain('withAppName("ورود")');
    expect(login).toContain("حساب کاربری {APP_NAME}");
    expect(register).toContain('withAppName("ثبت‌نام")');
    expect(forgotPassword).toContain('withAppName("فراموشی رمز عبور")');
  });

  test("root and primary page metadata derive from the canonical brand", async () => {
    const sources = await Promise.all([
      readSource("../src/routes/__root.tsx"),
      readSource("../src/routes/index.tsx"),
      readSource("../src/routes/dashboard.index.tsx"),
      readSource("../src/routes/dashboard.generator.tsx"),
      readSource("../src/routes/dashboard.timetable.tsx"),
    ]);

    expect(sources[0]).toContain("{ title: APP_NAME }");
    expect(
      sources
        .slice(1)
        .every((source) => source.includes("APP_NAME") || source.includes("withAppName")),
    ).toBe(true);
  });

  test("user-facing branding sources contain no old product-name variant", async () => {
    const sources = await Promise.all([
      readSource("../src/components/sidebar.tsx"),
      readSource("../src/routes/__root.tsx"),
      readSource("../src/routes/index.tsx"),
      readSource("../src/routes/auth.login.tsx"),
      readSource("../src/routes/auth.register.tsx"),
      readSource("../src/routes/auth.forgot-password.tsx"),
      readSource("../src/routes/dashboard.index.tsx"),
      readSource("../src/routes/dashboard.classes.tsx"),
      readSource("../src/routes/dashboard.teachers.tsx"),
      readSource("../src/routes/dashboard.subjects.tsx"),
      readSource("../src/routes/dashboard.settings.tsx"),
      readSource("../src/routes/dashboard.generator.tsx"),
      readSource("../src/routes/dashboard.timetable.tsx"),
      readSource("../src/lib/timetable.ts"),
    ]);

    for (const source of sources) {
      for (const variant of oldBrandVariants) expect(source).not.toContain(variant);
    }
  });
});
