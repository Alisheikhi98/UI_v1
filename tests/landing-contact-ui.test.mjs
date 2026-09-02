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

    expect(containerClasses).toHaveLength(7);
    expect(containerClasses.every((className) => className.includes("mx-auto"))).toBe(true);
    expect(containerClasses.every((className) => className.includes("w-full"))).toBe(true);
    expect(source).toContain("mx-auto mt-9 grid w-full max-w-5xl");
    expect(source).toContain("mx-auto grid w-full max-w-5xl");
  });

  test("renders four capability-based plans with only the approved paid-plan prices", async () => {
    const source = await readSource("../src/routes/index.tsx");

    for (const planName of ["پلن آزمایشی پایه", "پلن حرفه‌ای", "پلن پیشرفته", "پلن سازمانی"]) {
      expect(source).toContain(planName);
    }

    expect(source).toContain("پلن مناسب مدرسه خود را انتخاب کنید");
    expect(source).toContain("۵ روز اعتبار");
    expect(source).toContain("حداکثر ۲۰ بار ساخت برنامه در کل دوره");
    expect(source).toContain(
      "ظرفیت دبیر و کلاس این پلن برای ارزیابی کامل سامانه بازتر است، اما دوره فقط ۵ روز و حداکثر ۲۰ بار ساخت برنامه فعال است.",
    );
    expect(source).toContain("پیشنهاد ویژه");
    expect(source).toContain("تماس برای مشاوره");
    expect(source).toContain('price: "۱٬۵۰۰٬۰۰۰"');
    expect(source).toContain('price: "۲٬۵۰۰٬۰۰۰"');
    expect(source.match(/price: "/g)).toHaveLength(2);
    expect(source).not.toContain("ریال");
  });

  test("uses honest responsive plan CTAs and the existing Contact section", async () => {
    const source = await readSource("../src/routes/index.tsx");

    expect(source).toContain('<Link to="/auth/register">{plan.cta}</Link>');
    expect(source).toContain('<a href="#contact">{plan.cta}</a>');
    expect(source).toContain('id="contact"');
    expect(source).toContain("md:grid-cols-2 xl:grid-cols-4");
    expect(source).toContain("max-w-7xl");
    expect(source).toContain('className="w-full"');
  });

  test("exposes an accessible Pricing shortcut and stable direct anchor", async () => {
    const source = await readSource("../src/routes/index.tsx");

    expect(source).toContain('<a href="#pricing">');
    expect(source).toContain("تعرفه‌ها");
    expect(source).toContain("<Tag");
    expect(source).toContain('id="pricing"');
    expect(source).toContain("scroll-mt-20");
  });

  test("gives every plan a distinct restrained visual treatment", async () => {
    const source = await readSource("../src/routes/index.tsx");

    expect(source).toContain("border-sky-200/80 bg-sky-50/35");
    expect(source).toContain("border-emerald-200/80 bg-emerald-50/30");
    expect(source).toContain("border-indigo-400/80 bg-indigo-50/45 shadow-lg");
    expect(source).toContain("border-amber-200/90 bg-amber-50/35");
    expect(source).toContain("motion-reduce:transition-none");
    expect(source).toContain("پیشنهاد ویژه");
  });

  test("keeps the Advanced badge on the physical left without changing header height", async () => {
    const source = await readSource("../src/routes/index.tsx");

    expect(source).toContain("absolute end-0 top-0");
    expect(source).toContain('className="relative min-h-28"');
    expect(source).not.toContain("mb-3 inline-flex rounded-full bg-indigo-600");
  });

  test("places paid-plan prices in the bottom action area directly above the CTA", async () => {
    const source = await readSource("../src/routes/index.tsx");
    const featuresIndex = source.indexOf('<ul className="flex-1 space-y-3"');
    const priceIndex = source.indexOf('"price" in plan', featuresIndex);
    const ctaIndex = source.indexOf('plan.destination === "register"', priceIndex);

    expect(featuresIndex).toBeGreaterThan(-1);
    expect(priceIndex).toBeGreaterThan(featuresIndex);
    expect(ctaIndex).toBeGreaterThan(priceIndex);
    expect(source).toContain('className="mt-6 min-h-9 text-center"');
    expect(source).toContain("items-baseline justify-center");
    expect(source).toContain('className="mt-3"');
  });
});
