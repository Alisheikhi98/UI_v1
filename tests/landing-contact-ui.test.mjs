import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import { CONTACT_INFO } from "../src/lib/contact-info.ts";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

describe("landing and dashboard contact experience", () => {
  test("keeps contact content in one canonical ordered model", () => {
    expect(CONTACT_INFO.title).toBe("راه ارتباطی");
    expect(CONTACT_INFO.baleIds).toEqual(["@amirmbd", "@AliSheikhi98"]);
  });

  test("renders the compact product-focused landing flow and canonical contact section", async () => {
    const source = await readSource("../src/routes/index.tsx");

    expect(source).toContain("ساخت برنامه مدرسه");
    expect(source).toContain("از داده‌های مدرسه تا برنامه هفتگی");
    expect(source).toContain("چیدمان چگونه کار می‌کند؟");
    expect(source).toContain('<Link to="/auth/login">');
    expect(source).toContain('<Link to="/auth/register">');
    expect(source).toContain("{CONTACT_INFO.title}");
    expect(source).toContain('<ContactChannels className="mt-5" />');
    expect(source).not.toContain("۵۰۰+");
    expect(source).not.toContain("مشاهده دمو");
  });

  test("replaces the notification control with an accessible contact popover", async () => {
    const source = await readSource("../src/components/header.tsx");

    expect(source).toContain("PhoneCall");
    expect(source).toContain("<Popover>");
    expect(source).toContain("aria-label={CONTACT_INFO.title}");
    expect(source).toContain("<ContactChannels />");
    expect(source).not.toContain("Bell");
    expect(source).not.toContain("اعلان‌ها");
  });

  test("copies only the selected Bale ID with a subtle localized status", async () => {
    const source = await readSource("../src/components/contact-channels.tsx");

    expect(source).toContain("navigator.clipboard.writeText(value)");
    expect(source).toContain('document.execCommand("copy")');
    expect(source).toContain("`${baleId} کپی شد`");
    expect(source).toContain('aria-live="polite"');
    expect(source).not.toContain("toast(");
  });

  test("keeps the landing and contact popover within narrow viewports", async () => {
    const [landing, header, popover] = await Promise.all([
      readSource("../src/routes/index.tsx"),
      readSource("../src/components/header.tsx"),
      readSource("../src/components/ui/popover.tsx"),
    ]);

    expect(landing).toContain("overflow-x-clip");
    expect(landing).toContain("lg:grid-cols-[1.05fr_0.95fr]");
    expect(landing).toContain("md:grid-cols-3");
    expect(header).toContain("w-[calc(100vw-2rem)] max-w-80");
    expect(popover).toContain("max-w-[calc(100vw-1rem)]");
  });

  test("centers every landing container and keeps card groups full width", async () => {
    const source = await readSource("../src/routes/index.tsx");
    const containerClasses = [...source.matchAll(/className="([^"]*\bcontainer\b[^"]*)"/g)].map(
      ([, className]) => className,
    );

    expect(containerClasses).toHaveLength(6);
    expect(containerClasses.every((className) => className.includes("mx-auto"))).toBe(true);
    expect(containerClasses.every((className) => className.includes("w-full"))).toBe(true);
    expect(source).toContain("mx-auto mt-9 grid w-full max-w-5xl");
    expect(source).toContain("mx-auto grid w-full max-w-5xl");
  });
});
