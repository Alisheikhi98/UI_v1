import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import { deriveDashboardReadiness, getPublishedSchedule } from "../src/lib/dashboard-overview.ts";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

const readyStatistics = {
  activeTeacherCount: 8,
  activeClassCount: 4,
  activeDayCount: 5,
  activeWeeklySlotCount: 30,
  assignedWeeklySlotCount: 18,
  emptyWeeklySlotCount: 102,
};

describe("Dashboard operational overview", () => {
  test("no-School users receive the existing School onboarding route", async () => {
    const source = await readSource("../src/routes/dashboard.index.tsx");
    expect(source).toContain("برای شروع، ابتدا مدرسه خود را ایجاد کنید.");
    expect(source).toContain('<Link to="/dashboard/schools">ایجاد مدرسه</Link>');
    expect(source).toContain("!overview.school");
  });

  test("metrics map only authoritative aggregate School statistics", async () => {
    const [route, queries, dtos] = await Promise.all([
      readSource("../src/routes/dashboard.index.tsx"),
      readSource("../src/lib/dashboard-queries.ts"),
      readSource("../src/lib/api/dtos.ts"),
    ]);
    expect(route).toContain("statistics?.activeClassCount");
    expect(route).toContain("statistics?.activeTeacherCount");
    expect(route).toContain("statistics?.assignedWeeklySlotCount");
    expect(route).toContain("statistics?.activeDayCount");
    expect(queries).toContain("activeTeacherCount: dto.active_teacher_count");
    expect(dtos).toContain("active_class_count: number");
    expect(dtos).toContain("assigned_weekly_slot_count: number");
  });

  test("readiness reports supported blockers and a verified prerequisite-ready state", () => {
    expect(deriveDashboardReadiness(readyStatistics)).toEqual({ ready: true, blockers: [] });

    const blocked = deriveDashboardReadiness({
      ...readyStatistics,
      activeTeacherCount: 0,
      activeClassCount: 2,
      activeDayCount: 0,
      activeWeeklySlotCount: 0,
      assignedWeeklySlotCount: 0,
    });
    expect(blocked.ready).toBe(false);
    expect(blocked.blockers.map((item) => item.id)).toEqual([
      "teachers",
      "calendar",
      "assignments",
    ]);
  });

  test("published timetable status comes only from the authoritative selected candidate", () => {
    const candidates = [
      { id: "1", status: "OPTIMAL", totalGap: 0, selected: false, createdAt: "2026-01-01" },
      { id: "2", status: "FEASIBLE", totalGap: 1, selected: true, createdAt: "2026-01-02" },
    ];
    expect(getPublishedSchedule(candidates)?.id).toBe("2");
    expect(getPublishedSchedule(candidates.slice(0, 1))).toBeNull();
  });

  test("candidate loading uses one school-scoped endpoint and exposes the correct CTAs", async () => {
    const [route, queries, api, keys] = await Promise.all([
      readSource("../src/routes/dashboard.index.tsx"),
      readSource("../src/lib/dashboard-queries.ts"),
      readSource("../src/lib/api/schedule-api.ts"),
      readSource("../src/lib/repository-query-keys.ts"),
    ]);
    expect(api).toContain("/candidates`");
    expect(api).toContain("rows.map(mapCandidateSummary)");
    expect(queries).toContain("scheduleApi.listCandidates");
    expect(keys).toContain("scheduleCandidates: (schoolId");
    expect(route).toContain("هنوز برنامه هفتگی نهایی ثبت نشده است.");
    expect(route).toContain("مشاهده برنامه هفتگی");
    expect(route).toContain('"/dashboard/timetable" : "/dashboard/generator"');
  });

  test("loading and section failures never render fake zeroes or raw errors", async () => {
    const source = await readSource("../src/routes/dashboard.index.tsx");
    expect(source).toContain("dashboard-metric-skeleton");
    expect(source).toContain("DashboardLoading");
    expect(source).toContain("SectionError");
    expect(source).not.toContain("error.message");
    expect(source).not.toContain("value: 12");
    expect(source).not.toContain("+۲ این ماه");
  });

  test("API mode uses bounded aggregate requests with no Dashboard N+1 or inline demo data", async () => {
    const [route, queries] = await Promise.all([
      readSource("../src/routes/dashboard.index.tsx"),
      readSource("../src/lib/dashboard-queries.ts"),
    ]);
    expect(queries).toContain("/statistics`");
    expect(queries).toContain("scheduleApi.listCandidates");
    expect(queries).not.toContain("useGeneratorReadiness");
    expect(queries).not.toContain("teacherAvailability");
    expect(route).not.toContain("mockActivities");
    expect(route).not.toContain("mockAlerts");
    expect(route).not.toContain("useCoursesRepository");
    expect(route).not.toContain("TrendingUp");
  });

  test("responsive hierarchy is single-column first and expands without horizontal surfaces", async () => {
    const source = await readSource("../src/routes/dashboard.index.tsx");
    expect(source).toContain("sm:grid-cols-2 xl:grid-cols-4");
    expect(source).toContain("lg:grid-cols-2");
    expect(source).toContain("sm:grid-cols-2 lg:grid-cols-5");
    expect(source).toContain('className="w-full sm:w-auto"');
  });
});
