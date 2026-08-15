import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import {
  getBreakDuration,
  getScheduleValidationError,
  shiftTimeByMinutes,
  updateBreakDuration,
} from "../src/lib/school-schedule.ts";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");
const periods = [
  { index: 1, start: "08:00", end: "08:45" },
  { index: 2, start: "08:55", end: "09:40" },
  { index: 3, start: "09:50", end: "10:35" },
  { index: 4, start: "10:45", end: "11:30" },
];

describe("Schools page presentation", () => {
  test("uses the shared page header and removes the daily-average metric", async () => {
    const source = await readSource("../src/routes/dashboard.schools.tsx");
    expect(source).toContain('<Header\n        title="مدرسه"');
    expect(source).toContain("مشخصات مدرسه، روزهای کاری و برنامه زمانی زنگ‌ها را مدیریت کنید.");
    expect(source).not.toContain("میانگین زنگ‌های روزانه");
    expect(source).not.toContain("dailyPeriods");
  });

  test("dialog title and helper text reserve close-button space and render RTL", async () => {
    const source = await readSource("../src/routes/dashboard.schools.tsx");
    expect(source).toContain('<DialogContent dir="rtl"');
    expect(source).toContain('DialogHeader className="w-full text-right sm:text-right"');
    const dialogSource = await readSource("../src/components/ui/dialog.tsx");
    expect(dialogSource).toContain("space-y-1.5 pe-10 text-start");
    expect(source).toContain('DialogDescription dir="rtl" className="text-right leading-relaxed"');
  });

  test("School identifier uses a Fingerprint icon without a Hash icon", async () => {
    const source = await readSource("../src/routes/dashboard.schools.tsx");
    expect(source).toContain("Fingerprint");
    expect(source).not.toMatch(/\bHash\b/);
    expect(source).toContain("شناسه: {school.slug}");
  });

  test("desktop timing controls stay in one balanced four-column grid", async () => {
    const source = await readSource("../src/routes/dashboard.schools.tsx");
    expect(source).toContain('data-testid="school-timing-settings-grid"');
    expect(source).toContain(
      "lg:grid-cols-[minmax(90px,0.7fr)_minmax(190px,1.25fr)_minmax(140px,1fr)_minmax(180px,1.15fr)]",
    );
    expect(source).toContain("sm:grid-cols-2");
    expect(source).toContain('labelClassName="min-h-10 items-end"');
    expect(source).not.toContain("lg:grid-cols-4");
  });

  test("start-time controls move explicitly in 15-minute increments", async () => {
    expect(shiftTimeByMinutes("08:00", 15)).toBe("08:15");
    expect(shiftTimeByMinutes("08:00", -15)).toBe("07:45");
    const source = await readSource("../src/routes/dashboard.schools.tsx");
    expect(source).toContain('aria-label="۱۵ دقیقه دیرتر"');
    expect(source).toContain('aria-label="۱۵ دقیقه زودتر"');
    expect(source).toContain("shiftTimeByMinutes(current.timing.dayStart, 15)");
    expect(source).toContain("shiftTimeByMinutes(current.timing.dayStart, -15)");
  });
});

describe("Independent School breaks", () => {
  test("editing Break 3 changes only its adjacent next-period start", () => {
    const result = updateBreakDuration(periods, 2, 20);
    expect(result.error).toBeNull();
    expect(result.periods[3].start).toBe("10:55");
    expect(result.periods[0]).toEqual(periods[0]);
    expect(result.periods[1]).toEqual(periods[1]);
    expect(result.periods[2]).toEqual(periods[2]);
    expect(getBreakDuration(result.periods, 0)).toBe(10);
    expect(getBreakDuration(result.periods, 1)).toBe(10);
    expect(getBreakDuration(result.periods, 2)).toBe(20);
  });

  test("negative, excessive, and overlapping break schedules are blocked", () => {
    expect(updateBreakDuration(periods, 2, -1).error).not.toBeNull();
    expect(updateBreakDuration(periods, 2, 60).error).not.toBeNull();
    expect(
      getScheduleValidationError([
        periods[0],
        { ...periods[1], start: "08:40" },
        ...periods.slice(2),
      ]),
    ).not.toBeNull();
  });

  test("each visible break editor derives from its own adjacent slot boundaries", async () => {
    const source = await readSource("../src/routes/dashboard.schools.tsx");
    expect(source).toContain("getBreakDuration(form.periods, idx)");
    expect(source).toContain("updateBreak(idx, Number(event.target.value))");
    expect(source).toContain("data-testid={`break-duration-${idx + 1}`}");
    expect(source).not.toContain(
      'استراحت {form.timing.breakDuration.toLocaleString("fa-IR")} دقیقه',
    );
  });

  test("save persistence continues to send exact explicit period boundaries", async () => {
    const source = await readSource("../src/lib/api/schools-store.ts");
    expect(source).toContain("start_time: period.start");
    expect(source).toContain("end_time: period.end");
    expect(source).toContain("await getSchoolWeek(id)");
  });
});
