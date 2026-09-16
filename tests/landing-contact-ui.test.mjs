import { readFile, stat } from "node:fs/promises";
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

    expect(source).toContain("برنامه هفتگی مدرسه را");
    expect(source).toContain("هوشمندانه بچینید");
    expect(source).toContain("از داده‌های مدرسه تا برنامه هفتگی");
    expect(source).toContain("چیدمان چگونه کار می‌کند؟");
    expect(source).toContain("چرا ساخت برنامه هفتگی سخت می‌شود؟");
    expect(source).toContain("قبل از نهایی‌کردن، برنامه را دقیق بررسی کنید");
    expect(source).toContain("آماده‌اید برنامه هفتگی مدرسه را ساده‌تر بسازید؟");
    expect(source).toContain('<Link to="/auth/login">');
    expect(source).toContain('<Link to="/auth/register">');
    expect(source).toContain("{CONTACT_INFO.title}");
    expect(source).toContain('<ContactChannels className="mt-5" />');
    expect(source).not.toContain("۵۰۰+");
    expect(source).not.toContain("مشاهده دمو");
  });

  test("removes dashboard Search and Contact controls in favor of the Subscription link", async () => {
    const source = await readSource("../src/components/header.tsx");

    expect(source).toContain('to="/dashboard/subscription"');
    expect(source).toContain("وضعیت اشتراک در دسترس نیست");
    expect(source).not.toContain("SearchInput");
    expect(source).not.toContain("PhoneCall");
    expect(source).not.toContain("<Popover>");
    expect(source).not.toContain("Bell");
    expect(source).not.toContain("اعلان‌ها");
  });

  test("copies only the selected Bale ID with a subtle localized status", async () => {
    const [source, clipboard] = await Promise.all([
      readSource("../src/components/contact-channels.tsx"),
      readSource("../src/lib/copy-text.ts"),
    ]);

    expect(source).toContain('import { copyText } from "@/lib/copy-text"');
    expect(clipboard).toContain("navigator.clipboard.writeText(value)");
    expect(clipboard).toContain('document.execCommand("copy")');
    expect(source).toContain("`${baleId} کپی شد`");
    expect(source).toContain('aria-live="polite"');
    expect(source).not.toContain("toast(");
  });

  test("keeps the landing and Subscription header link within narrow viewports", async () => {
    const [landing, header] = await Promise.all([
      readSource("../src/routes/index.tsx"),
      readSource("../src/components/header.tsx"),
    ]);

    expect(landing).toContain("overflow-x-clip");
    expect(landing).toContain("flex w-full max-w-7xl justify-center");
    expect(landing).toContain("md:grid-cols-3");
    expect(landing).toContain("sm:grid-cols-2 lg:grid-cols-4");
    expect(header).toContain("max-w-44");
    expect(header).toContain("sm:max-w-56");
    expect(header).toContain("truncate");
  });

  test("centers every landing container and keeps card groups full width", async () => {
    const source = await readSource("../src/routes/index.tsx");
    const containerClasses = [...source.matchAll(/className="([^"]*\bcontainer\b[^"]*)"/g)].map(
      ([, className]) => className,
    );

    expect(containerClasses.length).toBeGreaterThanOrEqual(9);
    expect(containerClasses.every((className) => className.includes("mx-auto"))).toBe(true);
    expect(containerClasses.every((className) => className.includes("w-full"))).toBe(true);
    expect(source).toContain("mx-auto mt-9 grid w-full max-w-6xl");
    expect(source).toContain("mx-auto grid w-full max-w-4xl");
  });

  test("uses the requested RTL SaaS sections and real supported capabilities", async () => {
    const source = await readSource("../src/routes/index.tsx");

    for (const section of ['id="features"', 'id="workflow"', 'id="pricing"', 'id="contact"']) {
      expect(source).toContain(section);
    }

    for (const capability of [
      "مدیریت کلاس‌ها",
      "مدیریت دبیران",
      "محدودیت روزهای حضور",
      "درس‌های هر کلاس",
      "تولید با محدودیت‌ها",
      "نمای مدرسه، کلاس و دبیر",
      "خروجی اکسل",
      "بررسی آمادگی",
    ]) {
      expect(source).toContain(capability);
    }

    expect(source).toContain("TimetableProductPreview");
    expect(source).toContain('document.documentElement.style.scrollBehavior = "smooth"');
    expect(source).toContain('aria-label="بخش‌های صفحه"');
  });

  test("uses only the local timetable product screenshot", async () => {
    const source = await readSource("../src/routes/index.tsx");
    const timetableImage = await stat(
      new URL("../src/assets/landing/weekly-timetable-preview.png", import.meta.url),
    );

    expect(source).toContain(
      'import weeklyTimetablePreviewImage from "@/assets/landing/weekly-timetable-preview.png"',
    );
    expect(source).not.toContain("teachersPreviewImage");
    expect(source).not.toContain("نمای واقعی مدیریت دبیران");
    expect(source).toContain('alt="نمای واقعی برنامه هفتگی مدرسه در چیدمان"');
    expect(source).toContain('loading={priority ? "eager" : "lazy"}');
    expect(source).toContain('fetchPriority={priority ? "high" : "auto"}');
    expect(source).not.toContain("timetablePreviewRows");
    expect(timetableImage.size).toBeGreaterThan(100_000);
  });

  test("keeps the landing workflow to three clear steps", async () => {
    const source = await readSource("../src/routes/index.tsx");

    expect(source).toContain('number: "۱"');
    expect(source).toContain('number: "۲"');
    expect(source).toContain('number: "۳"');
    expect(source.match(/number: "[۱-۳]"/g)).toHaveLength(3);
    expect(source).toContain("اطلاعات مدرسه را وارد کنید");
    expect(source).toContain("کلاس‌ها، دبیران و درس‌ها را تنظیم کنید");
    expect(source).toContain("برنامه را تولید و بررسی کنید");
  });

  test("renders four capability-based plans with only the approved paid-plan prices", async () => {
    const [source, plans] = await Promise.all([
      readSource("../src/routes/index.tsx"),
      readSource("../src/lib/plans.ts"),
    ]);

    for (const planName of ["پلن آزمایشی پایه", "پلن حرفه‌ای", "پلن پیشرفته", "پلن سازمانی"]) {
      expect(plans).toContain(planName);
    }

    expect(source).toContain("PLAN_CATALOG.map");
    expect(source).toContain("پلن مناسب مدرسه خود را انتخاب کنید");
    expect(plans).toContain("۵ روز اعتبار");
    expect(plans).toContain("حداکثر ۲۰ بار ساخت برنامه در کل دوره");
    expect(plans).toContain(
      "ظرفیت دبیر و کلاس این پلن برای ارزیابی کامل سامانه بازتر است، اما دوره فقط ۵ روز و حداکثر ۲۰ بار ساخت برنامه فعال است.",
    );
    expect(plans).toContain("پیشنهاد ویژه");
    expect(plans).toContain("تماس برای مشاوره");
    expect(plans).toContain('price: "۴٬۰۰۰٬۰۰۰"');
    expect(plans).toContain('price: "۶٬۰۰۰٬۰۰۰"');
    expect(plans.match(/price: "/g)).toHaveLength(2);
    expect(plans).not.toContain("ریال");
  });

  test("uses honest responsive plan CTAs and the existing Contact section", async () => {
    const source = await readSource("../src/routes/index.tsx");

    expect(source).toContain('<Link to="/auth/register">{plan.landingCta}</Link>');
    expect(source).toContain("handlePaidPlanSelection(plan.id)");
    expect(source).toContain('<a href="#contact">{plan.landingCta}</a>');
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
    const [source, plans] = await Promise.all([
      readSource("../src/routes/index.tsx"),
      readSource("../src/lib/plans.ts"),
    ]);

    expect(plans).toContain("border-sky-200/80 bg-sky-50/35");
    expect(plans).toContain("border-emerald-200/80 bg-emerald-50/30");
    expect(plans).toContain("border-indigo-400/80 bg-indigo-50/45 shadow-lg");
    expect(plans).toContain("border-amber-200/90 bg-amber-50/35");
    expect(source).toContain("motion-reduce:transition-none");
    expect(source).toContain("plan.badge");
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
    const ctaIndex = source.indexOf('plan.landingDestination === "register"', priceIndex);

    expect(featuresIndex).toBeGreaterThan(-1);
    expect(priceIndex).toBeGreaterThan(featuresIndex);
    expect(ctaIndex).toBeGreaterThan(priceIndex);
    expect(source).toContain('className="mt-6 min-h-9 text-center"');
    expect(source).toContain("items-baseline justify-center");
    expect(source).toContain('className="mt-3"');
  });
});
