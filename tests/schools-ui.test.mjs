import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import {
  applyPeriodTimeDrafts,
  createPeriodTimeDrafts,
  getBreakDuration,
  getScheduleValidationError,
  getTimeInputState,
  periodTimeDraftKey,
  shiftTimeByMinutes,
  updateBreakDuration,
} from "../src/lib/school-schedule.ts";

const readSource = async (path) =>
  (await readFile(new URL(path, import.meta.url), "utf8")).replaceAll("\r\n", "\n");
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

  test("safe School deletion is edit-only and requires explicit confirmation", async () => {
    const source = await readSource("../src/routes/dashboard.schools.tsx");
    expect(source).toContain("{editing ? (");
    expect(source).toContain("setDeleteConfirmationOpen(true)");
    expect(source).toContain("تمام اطلاعات مربوط به کلاس‌ها و معلمان این مدرسه حذف می‌شوند");
    expect(source).toContain("open={deleteConfirmationOpen}");
    expect(source).toContain("await onDelete()");
    expect(source).toContain("deleteInFlightRef.current");
    const initialDeleteAction = source.slice(
      source.indexOf("setDeleteConfirmationOpen(true)"),
      source.indexOf("<AlertDialog", source.indexOf("setDeleteConfirmationOpen(true)")),
    );
    expect(initialDeleteAction).not.toContain("handleDelete");
    expect(source).toContain("onClick={handleDelete}");
  });

  test("School level is selectable only while creating a School", async () => {
    const source = await readSource("../src/routes/dashboard.schools.tsx");
    const store = await readSource("../src/lib/api/schools-store.ts");
    expect(source).toContain('labelNote={editing ? "قابل ویرایش نیست." : undefined}');
    expect(source).toContain("disabled={Boolean(editing)}");
    expect(source).toContain("EDUCATION_STAGE_OPTIONS.map");
    expect(source).toContain("setForm({ ...form, educationStage })");
    expect(source).not.toContain("مقطع ثبت‌شده:");
    expect(store).toContain("body: JSON.stringify({ name: data.name, slug: data.slug })");
    expect(store).not.toMatch(
      /updateSchoolWithApi[\s\S]*?body: JSON\.stringify\(\{[^}]*education_stage/,
    );
  });

  test("School delete action stays in the footer with pending and error feedback", async () => {
    const source = await readSource("../src/routes/dashboard.schools.tsx");
    const footer = source.slice(source.indexOf('<DialogFooter className="border-t pt-4'));
    expect(footer).toContain("sm:justify-between");
    expect(footer).toContain("حذف مدرسه");
    expect(footer).toContain("در حال حذف…");
    expect(footer).toContain('role="alert"');
    expect(source).toContain("getSchoolDeleteErrorMessage(error)");
    expect(footer).not.toContain("error.message");
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

describe("School period time editing", () => {
  const typingPeriods = [
    { index: 1, start: "08:00", end: "08:45" },
    { index: 2, start: "09:00", end: "09:45" },
    { index: 3, start: "10:00", end: "11:05" },
    { index: 4, start: "11:15", end: "12:00" },
  ];
  const period4Start = periodTimeDraftKey(4, "start");

  test("partial manual values remain incomplete and never become overlap inputs", () => {
    const committed = createPeriodTimeDrafts(typingPeriods);
    for (const raw of ["1", "11", "11:", "11:2"]) {
      const drafts = { ...committed, [period4Start]: raw };
      expect(getTimeInputState(raw)).toBe("incomplete");
      expect(applyPeriodTimeDrafts(typingPeriods, drafts)).toBeNull();
      expect(getScheduleValidationError(typingPeriods)).toBeNull();
    }
  });

  test("accepts 11:20 after Period 3 ends at 11:05 and rejects the real 11:00 overlap", () => {
    const drafts = createPeriodTimeDrafts(typingPeriods);
    const valid = applyPeriodTimeDrafts(typingPeriods, { ...drafts, [period4Start]: "11:20" });
    const overlapping = applyPeriodTimeDrafts(typingPeriods, {
      ...drafts,
      [period4Start]: "11:00",
    });

    expect(valid?.[3].start).toBe("11:20");
    expect(getScheduleValidationError(valid ?? [])).toBeNull();
    expect(overlapping).not.toBeNull();
    expect(getScheduleValidationError(overlapping ?? [])).toContain("هم‌پوشانی");
  });

  test("distinguishes incomplete edits from complete invalid hours and minutes", () => {
    expect(getTimeInputState("")).toBe("incomplete");
    expect(getTimeInputState("11:2")).toBe("incomplete");
    expect(getTimeInputState("25:00")).toBe("invalid");
    expect(getTimeInputState("11:60")).toBe("invalid");
    expect(getTimeInputState("11:20")).toBe("valid");
  });

  test("backspace and select-all replacement preserve the committed schedule until valid", () => {
    const drafts = createPeriodTimeDrafts(typingPeriods);
    const afterBackspace = { ...drafts, [period4Start]: "11:2" };
    expect(applyPeriodTimeDrafts(typingPeriods, afterBackspace)).toBeNull();
    expect(typingPeriods[3].start).toBe("11:15");

    const replacement = applyPeriodTimeDrafts(typingPeriods, {
      ...afterBackspace,
      [period4Start]: "11:20",
    });
    expect(replacement?.[3].start).toBe("11:20");
  });

  test("blur, Enter, Tab, and arrow behavior are connected to commit-safe handlers", async () => {
    const source = await readSource("../src/routes/dashboard.schools.tsx");
    expect(source).toContain('commitPeriodTimeOnBlur(p, "start")');
    expect(source).toContain('commitPeriodTimeOnBlur(p, "end")');
    expect(source).toContain('event.key === "ArrowUp" || event.key === "ArrowDown"');
    expect(source).toContain('event.key === "Enter"');
    expect(source).toContain("event.currentTarget.blur()");
    expect(source).toContain('inputMode="numeric"');
    expect(source).toContain("INCOMPLETE_TIME_MESSAGE");
    expect(shiftTimeByMinutes("07:45", 15)).toBe("08:00");
    expect(shiftTimeByMinutes("08:00", -15)).toBe("07:45");
  });

  test("time editing keeps independent break values and save uses complete drafts", async () => {
    const drafts = createPeriodTimeDrafts(periods);
    const updated = applyPeriodTimeDrafts(periods, {
      ...drafts,
      [periodTimeDraftKey(4, "start")]: "11:00",
    });
    expect(updated).not.toBeNull();
    expect(getBreakDuration(updated ?? [], 0)).toBe(10);
    expect(getBreakDuration(updated ?? [], 1)).toBe(10);
    expect(getBreakDuration(updated ?? [], 2)).toBe(25);

    const [route, store] = await Promise.all([
      readSource("../src/routes/dashboard.schools.tsx"),
      readSource("../src/lib/api/schools-store.ts"),
    ]);
    expect(route).toContain("applyPeriodTimeDrafts(form.periods, periodTimeDrafts)");
    expect(route).toContain("periods,");
    expect(store).toContain("start_time: period.start");
    expect(store).toContain("end_time: period.end");
    expect(store).toContain("await getSchoolWeek(id)");
  });
});
