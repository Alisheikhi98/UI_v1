import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import {
  EDUCATION_STAGES,
  getEducationStageLabel,
  getGradeOptions,
  supportsMajor,
} from "../src/lib/academic-policy.ts";
import { createCourseInputForClass } from "../src/lib/course-creation.ts";
import { mapClass, mapCourse } from "../src/lib/api/mappers.ts";

const readSource = async (path) =>
  (await readFile(new URL(path, import.meta.url), "utf8")).replaceAll("\r\n", "\n");

const timestamps = {
  active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("authoritative education-stage policy", () => {
  test("uses the exact backend stage codes and level-specific grades", () => {
    expect(EDUCATION_STAGES).toEqual({
      secondaryFirst: "secondary_first",
      secondarySecond: "secondary_second",
    });
    expect(getGradeOptions(EDUCATION_STAGES.secondaryFirst).map((item) => item.value)).toEqual([
      "7",
      "8",
      "9",
    ]);
    expect(getGradeOptions(EDUCATION_STAGES.secondarySecond).map((item) => item.value)).toEqual([
      "10",
      "11",
      "12",
    ]);
    expect(supportsMajor(EDUCATION_STAGES.secondaryFirst)).toBe(false);
    expect(supportsMajor(EDUCATION_STAGES.secondarySecond)).toBe(true);
    expect(getEducationStageLabel(EDUCATION_STAGES.secondaryFirst)).toBe("متوسطه اول");
  });

  test("preserves nullable Major IDs in canonical Class and Course mapping", () => {
    expect(
      mapClass({
        id: 12,
        school_id: 3,
        major_id: null,
        name: "هفتم الف",
        grade: 7,
        ...timestamps,
      }).majorId,
    ).toBeNull();
    expect(
      mapCourse({
        id: 21,
        school_id: null,
        major_id: null,
        name: "ریاضی",
        grade: 7,
        category: "general",
        course_code: "MATH-7-G",
        ...timestamps,
      }).majorId,
    ).toBeNull();
  });

  test("creates Middle School Courses from the selected Class without a fake Major", () => {
    expect(createCourseInputForClass({ gradeId: "8", majorId: null }, "علوم")).toMatchObject({
      gradeId: "8",
      majorId: null,
      category: "general",
    });
  });
});

describe("School and Classes stage-aware UI", () => {
  test("School create sends education_stage while edit does not send unsupported fields", async () => {
    const store = await readSource("../src/lib/api/schools-store.ts");
    const route = await readSource("../src/routes/dashboard.schools.tsx");
    expect(store).toContain("education_stage: data.educationStage");
    expect(store).toContain("educationStage: school.education_stage");
    expect(route).toContain('label="مقطع *"');
    expect(route).toContain("disabled={Boolean(editing)}");
    expect(route).not.toContain("مجموع مدارس");
    expect(route).not.toContain("مجموعه مدارس");
    expect(route).not.toContain("روزهای کاری فعال");
  });

  test("Classes hide non-applicable Major UI and send null for Middle School", async () => {
    const route = await readSource("../src/routes/dashboard.classes.tsx");
    const sheet = await readSource("../src/components/classes/class-assignments-sheet.tsx");
    expect(route).toContain("در متوسطه اول رشته تعریف نمی‌شود.");
    expect(route).toContain("majorId: majorApplies ? data.majorId : null");
    expect(route).toContain("{majorApplies ? classItem.majorName : null}");
    expect(route).toContain("...gradeOptions");
    expect(sheet).toContain('classItem.majorName ? ` • رشته ${classItem.majorName}` : ""');
  });

  test("Sidebar uses the singular School-management label", async () => {
    const sidebar = await readSource("../src/components/sidebar.tsx");
    expect(sidebar).toContain('{ name: "مدرسه", href: "/dashboard/schools"');
    expect(sidebar).not.toContain('{ name: "مدارس", href: "/dashboard/schools"');
  });

  test("compatible Courses remain one class-scoped backend query without N+1 requests", async () => {
    const repositories = await readSource("../src/lib/api/api-repositories.ts");
    expect(repositories).toContain(
      '`/schools/${schoolId}/classes/${toApiId(classId, "classId")}/courses`',
    );
    expect(repositories).not.toContain("classes.map");
  });

  test("School refresh invalidates the level-dependent school caches", async () => {
    const queries = await readSource("../src/lib/api/school-queries.ts");
    expect(queries).toContain("repositoryQueryKeys.classesRoot(scopedSchoolId)");
    expect(queries).toContain("repositoryQueryKeys.coursesRoot(scopedSchoolId)");
    expect(queries).toContain("repositoryQueryKeys.compatibleCoursesRoot(scopedSchoolId)");
    expect(queries).toContain("repositoryQueryKeys.assignmentsRoot(scopedSchoolId)");
  });
});
