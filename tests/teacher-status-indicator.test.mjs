import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = await readFile(
  fileURLToPath(new URL("../src/routes/dashboard.teachers.tsx", import.meta.url)),
  "utf8",
);

test("Teacher status uses compact accessible icons in desktop and mobile views", () => {
  assert.match(source, /function TeacherStatusIndicator/);
  assert.match(source, /aria-label=\{`وضعیت \$\{teacher\.name\}: \$\{statusLabel\}`\}/);
  assert.match(source, /data-status=\{teacher\.status\}/);
  assert.match(source, /bg-emerald-100/);
  assert.match(source, /bg-amber-100/);
  assert.match(source, /<Check[^>]*aria-hidden="true"/);
  assert.match(source, /<Minus[^>]*aria-hidden="true"/);
  assert.equal(source.match(/<TeacherStatusIndicator teacher=\{teacher\} \/>/g)?.length, 2);
  assert.doesNotMatch(
    source,
    /variant=\{teacher\.status === "active" \? "default" : "secondary"\}/,
  );
});
