import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { resolveActiveSchoolId } from "../src/lib/active-school.ts";

const readSource = async (relativePath) =>
  readFile(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

test("active school validation preserves accessible IDs and replaces stale IDs", () => {
  assert.equal(resolveActiveSchoolId("2", [1, 2, 3]), "2");
  assert.equal(resolveActiveSchoolId("99", [1, 2, 3]), "1");
  assert.equal(resolveActiveSchoolId(null, [4, 5]), "4");
  assert.equal(resolveActiveSchoolId("99", []), null);
});

test("class dialogs await mutations and guard pending close actions", async () => {
  const source = await readSource("../src/routes/dashboard.classes.tsx");
  assert.match(source, /onSave: \(data: ClassFormData\) => Promise<void>/);
  assert.match(source, /await onSave\(formData\)/);
  assert.match(source, /onSave: \(name: string\) => Promise<void>/);
  assert.match(source, /disabled=\{isDeletingClass\}/);
  assert.doesNotMatch(source, /if \(classToDelete\) handleDelete\(classToDelete\)/);
});

test("default teacher queries are active-only while explicit status remains supported", async () => {
  const hooksSource = await readSource("../src/lib/mock-queries.ts");
  const routeSource = await readSource("../src/routes/dashboard.teachers.tsx");
  assert.match(hooksSource, /filters: \{ \.\.\.filters, active: true \}/);
  assert.match(routeSource, /useState\("active"\)/);
  assert.match(routeSource, /filters: \{ active: teacherActiveFilter \}/);
});

test("empty day-slot state still performs delete-check and deletion", async () => {
  const source = await readSource("../src/lib/api/schools-store.ts");
  assert.doesNotMatch(source, /if \(desiredEntries\.length === 0\) return/);
  assert.match(source, /day-slots\/\$\{slot\.id\}\/delete-check/);
  assert.match(source, /confirm_delete_dependencies: deleteCheck\.requires_confirmation/);
});

test("protected 401 responses trigger guarded session recovery", async () => {
  const clientSource = await readSource("../src/lib/api/client.ts");
  const rootSource = await readSource("../src/routes/__root.tsx");
  assert.match(clientSource, /requiresAuth && response\.status === 401/);
  assert.match(rootSource, /window\.localStorage\.removeItem\("access_token"\)/);
  assert.match(rootSource, /queryClient\.clear\(\)/);
  assert.match(rootSource, /window\.location\.replace\("\/auth\/login"\)/);
});
