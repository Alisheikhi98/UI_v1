import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { normalizeHistoricalCandidate } from "../src/lib/timetable.ts";

const readSource = async (relativePath) =>
  (await readFile(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8")).replaceAll(
    "\r\n",
    "\n",
  );

const candidate = {
  id: "91",
  status: "FEASIBLE",
  totalGap: 0,
  selected: false,
  createdAt: "2026-08-17T08:00:00Z",
  lessons: [
    {
      assignmentId: "1",
      daySlotId: "30",
      teacherId: "20",
      classId: "10",
      courseId: "40",
      day: "Saturday",
      slot: 1,
    },
  ],
};

describe("read-only timetable history", () => {
  test("normalizes stored lessons for School, Class, and Teacher views", () => {
    const timetable = normalizeHistoricalCandidate({
      candidate,
      schoolName: "مدرسه نمونه",
      classes: [
        {
          id: "10",
          name: "دهم ریاضی",
          gradeId: "10",
          majorId: "2",
          studentCapacity: 30,
        },
      ],
      teachers: [
        {
          id: "20",
          name: "علی احمدی",
          email: "",
          phone: "",
          courseIds: [],
          status: "active",
        },
      ],
      assignmentCourseReferences: [{ assignmentId: "1", courseId: "40", courseName: "فیزیک" }],
      daySlotGroups: [
        {
          dayId: 1,
          dayName: "Saturday",
          slots: [
            {
              id: "30",
              schoolId: "1",
              dayId: 1,
              slotNumber: 1,
              title: null,
              startTime: "08:00:00",
              endTime: "08:45:00",
              active: true,
            },
          ],
        },
      ],
    });

    expect(timetable.id).toBe("candidate-91");
    expect(timetable.classes[0].name).toBe("دهم ریاضی");
    expect(timetable.teachers[0].name).toBe("علی احمدی");
    expect(timetable.entries[0]).toMatchObject({
      classId: "10",
      teacherId: "20",
      courseName: "فیزیک",
      dayId: "1",
      periodId: "slot-1",
    });
  });

  test("uses neutral typed fallbacks when current entities no longer resolve", () => {
    const timetable = normalizeHistoricalCandidate({
      candidate,
      schoolName: "مدرسه نمونه",
      classes: [],
      teachers: [],
      assignmentCourseReferences: [],
      daySlotGroups: [],
    });

    expect(timetable.classes[0].name).toBe("کلاس حذف‌شده");
    expect(timetable.teachers[0].name).toBe("معلم حذف‌شده");
    expect(timetable.entries[0].courseName).toBe("درس حذف‌شده");
    expect(timetable.days[0].label).toBe("شنبه");
  });

  test("loads a lightweight newest-first list and lazily requests only the selected detail", async () => {
    const [queries, keys, api, sheet] = await Promise.all([
      readSource("../src/lib/timetable-queries.ts"),
      readSource("../src/lib/repository-query-keys.ts"),
      readSource("../src/lib/api/schedule-api.ts"),
      readSource("../src/components/timetable/timetable-history-sheet.tsx"),
    ]);

    expect(keys).toContain('"schedule-candidates"');
    expect(queries).toContain("useScheduleHistory(enabled: boolean)");
    expect(queries).toContain("useHistoricalCandidateTimetable(candidateId: string | null");
    expect(queries).toContain("enabled: detailEnabled");
    expect(queries).toContain("{ signal }");
    expect(queries).toContain(
      "repositoryQueryKeys.scheduleAssignmentReferences(schoolId, classIds)",
    );
    expect(queries).toContain("listScheduleSnapshot");
    expect(api).toContain("/candidates`");
    expect(api).toContain('/candidates/${toApiId(candidateId, "candidateId")}');
    expect(sheet).not.toContain("useQueries");
    expect(sheet).not.toContain("history.data.map((candidate) => scheduleApi.getCandidate");
    expect(sheet).not.toContain(".sort(");
  });

  test("uses only backend-proven current and neutral previous status labels", async () => {
    const sheet = await readSource("../src/components/timetable/timetable-history-sheet.tsx");

    expect(sheet).toContain("برنامه فعلی");
    expect(sheet).toContain("برنامه قبلی");
    expect(sheet).not.toContain("قبلاً منتشرشده");
    expect(sheet).not.toContain("ناسازگار با اطلاعات فعلی");
  });

  test("keeps the historical viewer explicitly read-only and reuses timetable views", async () => {
    const sheet = await readSource("../src/components/timetable/timetable-history-sheet.tsx");

    expect(sheet).toContain("فقط برای مشاهده");
    expect(sheet).toContain("<SchoolMasterTimetable");
    expect(sheet).toContain("<EntityTimetable");
    expect(sheet).toContain('value="school"');
    expect(sheet).toContain('value="class"');
    expect(sheet).toContain('value="teacher"');
    expect(sheet).not.toContain("confirmCandidate");
    expect(sheet).not.toContain("useMutation");
    expect(sheet).not.toContain("انتخاب و ثبت برنامه");
  });

  test("isolates History loading and errors from the authoritative published timetable", async () => {
    const [route, sheet] = await Promise.all([
      readSource("../src/routes/dashboard.timetable.tsx"),
      readSource("../src/components/timetable/timetable-history-sheet.tsx"),
    ]);

    expect(route).toContain("usePublishedTimetable()");
    expect(route).toContain("<TimetableHistorySheet");
    expect(route).toContain("تاریخچه برنامه‌ها");
    expect(sheet).toContain("دریافت تاریخچه برنامه‌ها ممکن نشد.");
    expect(sheet).toContain("هنوز برنامه‌ای در تاریخچه وجود ندارد.");
    expect(sheet).not.toContain("error.message");
  });

  test("uses one responsive Sheet without global overflow or mutation actions", async () => {
    const sheet = await readSource("../src/components/timetable/timetable-history-sheet.tsx");

    expect(sheet).toContain("w-[calc(100%-1rem)]");
    expect(sheet).toContain("h-dvh");
    expect(sheet).toContain("lg:grid-cols-[19rem_minmax(0,1fr)]");
    expect(sheet).toContain("min-h-0 overflow-y-auto");
    expect(sheet).toContain("sm:flex-row");
  });

  test("refreshes the History list only after real Candidate mutations", async () => {
    const queries = await readSource("../src/lib/generator-queries.ts");
    const exactInvalidations = queries.match(
      /queryKey: repositoryQueryKeys\.scheduleCandidates\(schoolId\),\n\s*exact: true/g,
    );

    expect(exactInvalidations).toHaveLength(2);
  });
});
