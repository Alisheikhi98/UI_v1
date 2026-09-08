import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const rootSource = readFileSync("src/routes/__root.tsx", "utf8");
const styles = readFileSync("src/styles.css", "utf8");
const fontPath = "src/assets/fonts/vazirmatn-variable.woff2";

test("Vazirmatn is self-hosted without a runtime Google Fonts dependency", () => {
  assert.doesNotMatch(rootSource, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(styles, /@font-face\s*\{/);
  assert.match(styles, /url\("\.\/assets\/fonts\/vazirmatn-variable\.woff2"\)/);
  assert.match(styles, /font-display:\s*swap/);
  assert.match(styles, /font-weight:\s*100 900/);
});

test("the bundled font asset is a valid non-empty WOFF2 file", () => {
  assert.equal(existsSync(fontPath), true);
  assert.ok(statSync(fontPath).size > 0);
  assert.equal(readFileSync(fontPath).subarray(0, 4).toString("ascii"), "wOF2");
});
