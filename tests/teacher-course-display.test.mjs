import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { mapTeacherCourseGroupsToLabels } from "../src/lib/api/mappers.ts";
import { createTeacherCourseLabelModel } from "../src/lib/teacher-course-labels.ts";

const readSource = (relativePath) =>
  readFile(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

test("Teacher Course labels come only from backend display_name", async () => {
  const labels = mapTeacherCourseGroupsToLabels([
    {
      subject_code: "PHYSICS",
      display_name: "فیزیک",
      grades: [10],
      major_ids: [1],
      courses: [{ id: 91, name: "نام داخلی درس" }],
    },
    {
      subject_code: "MATH",
      display_name: "ریاضی",
      grades: [10],
      major_ids: [1],
      courses: [{ id: 92, name: "نام داخلی دیگر" }],
    },
  ]);
  assert.deepEqual(labels, ["فیزیک", "ریاضی"]);
  assert.doesNotMatch(labels.join(" "), /PHYSICS|MATH|نام داخلی/);
});

test("Course cell uses a compact single row with accessible overflow", async () => {
  const source = await readSource("../src/components/teachers/teacher-course-labels.tsx");
  assert.match(source, /flex-nowrap/);
  assert.match(source, /min-w-0/);
  assert.match(source, /whitespace-nowrap/);
  assert.match(source, /hiddenCount\.toLocaleString\("fa-IR"\)/);
  assert.match(source, /aria-label=/);

  const model = createTeacherCourseLabelModel(["۱", "۲", "۳", "۴", "۵"]);
  assert.equal(model.hiddenCount, 2);
});

test("loading and errors cannot render the authoritative empty label", async () => {
  const source = await readSource("../src/components/teachers/teacher-course-labels.tsx");
  const loadingBranch = source.slice(source.indexOf("if (loading)"), source.indexOf("if (error)"));
  const errorBranch = source.slice(
    source.indexOf("if (error)"),
    source.indexOf("if (labels.length === 0)"),
  );
  assert.doesNotMatch(loadingBranch, /بدون درس/);
  assert.doesNotMatch(errorBranch, /بدون درس/);
  assert.match(source, /if \(labels\.length === 0\)/);
  assert.match(source, /بدون درس/);
});

test("API Course queries stay school/Teacher scoped with no inferred fallback", async () => {
  const [keysSource, repositorySource, mapperSource, routeSource] = await Promise.all([
    readSource("../src/lib/repository-query-keys.ts"),
    readSource("../src/lib/api/api-repositories.ts"),
    readSource("../src/lib/api/mappers.ts"),
    readSource("../src/routes/dashboard.teachers.tsx"),
  ]);
  assert.match(keysSource, /\["schools", schoolId \?\? "none", "teachers", teacherId, "courses"\]/);
  assert.match(repositorySource, /mapTeacherCourseGroupsToLabels\(groups\)/);
  assert.match(mapperSource, /group\.display_name/);
  assert.doesNotMatch(routeSource, /useCoursesRepository|ClassAssignment/);
});
