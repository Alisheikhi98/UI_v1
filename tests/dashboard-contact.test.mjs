import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import { CONTACT_INFO } from "../src/lib/contact-info.ts";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

describe("authenticated Contact page", () => {
  test("registers an internal dashboard route and renders canonical Bale contacts", async () => {
    const source = await readSource("../src/routes/dashboard.contact.tsx");

    expect(source).toContain('createFileRoute("/dashboard/contact")');
    expect(source).toContain("<ContactChannels />");
    expect(source).toContain("ارتباط با ما");
    expect(CONTACT_INFO.baleIds).toEqual(["@amirmbd", "@AliSheikhi98"]);
    expect(CONTACT_INFO.primaryBaleId).toBe("@amirmbd");
  });

  test("opens only the primary Bale destination from the page in a new tab", async () => {
    const source = await readSource("../src/routes/dashboard.contact.tsx");

    expect(source).toContain("پیام در بله");
    expect(source).toContain("href={CONTACT_INFO.primaryBaleUrl}");
    expect(source).toContain('target="_blank"');
    expect(source).toContain('rel="noopener noreferrer"');
  });

  test("keeps external Bale behavior out of the responsive Sidebar", async () => {
    const source = await readSource("../src/components/sidebar.tsx");

    expect(source).toContain('{ name: "ارتباط با ما", href: "/dashboard/contact"');
    expect(source).toContain("onClick={() => setMobileMenuOpen(false)}");
    expect(source).toContain('aria-current={isActive ? "page" : undefined}');
    expect(source).not.toContain("externalHref");
    expect(source).not.toContain("primaryBaleUrl");
  });
});
