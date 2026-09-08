import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import { createGoogleAnalyticsPageView } from "../src/lib/google-analytics.ts";

const readSource = async (path) =>
  (await readFile(new URL(path, import.meta.url), "utf8")).replaceAll("\r\n", "\n");

describe("Google Analytics 4 integration", () => {
  test("creates privacy-safe page-view data without query strings or hashes", () => {
    expect(
      createGoogleAnalyticsPageView(
        "/dashboard/classes",
        "https://chideman.example/",
        "کلاس‌ها | چیدمان",
      ),
    ).toEqual({
      page_path: "/dashboard/classes",
      page_location: "https://chideman.example/dashboard/classes",
      page_title: "کلاس‌ها | چیدمان",
    });
  });

  test("loads GA once at the global root and disables its automatic page view", async () => {
    const [root, analytics] = await Promise.all([
      readSource("../src/routes/__root.tsx"),
      readSource("../src/lib/google-analytics.ts"),
    ]);
    expect(root).toContain("GOOGLE_ANALYTICS_SCRIPT_URL");
    expect(root).toContain("GOOGLE_ANALYTICS_BOOTSTRAP");
    expect(root).toContain("GOOGLE_ANALYTICS_ENABLED ?");
    expect(root).toContain("<GoogleAnalyticsPageViews />");
    expect(analytics).toContain("https://www.googletagmanager.com/gtag/js?id=");
    expect(analytics).toContain('GOOGLE_ANALYTICS_MEASUREMENT_ID = "G-4KPTLX24CE"');
    expect(analytics).toContain("send_page_view: false");
    expect(analytics).toContain("import.meta.env.PROD");
  });

  test("tracks pathname changes once without sending private route state", async () => {
    const tracker = await readSource("../src/components/google-analytics-page-views.tsx");
    const analytics = await readSource("../src/lib/google-analytics.ts");
    expect(tracker).toContain("state.location.pathname");
    expect(tracker).toContain("lastTrackedPath.current === pathname");
    expect(tracker).toContain("[pathname]");
    expect(analytics).toContain('window.gtag("event", "page_view", pageView)');
    expect(analytics).toContain("page_path");
    expect(analytics).toContain("page_location");
    expect(analytics).toContain("page_title");
    expect(tracker).not.toMatch(
      /location\.(search|hash)|user\.(name|email|phone)|school\.(name|id)|accessToken/,
    );
  });

  test("declares typed dataLayer and gtag globals", async () => {
    const analytics = await readSource("../src/lib/google-analytics.ts");
    expect(analytics).toContain("interface Window");
    expect(analytics).toContain("dataLayer?: unknown[]");
    expect(analytics).toContain("gtag?: GoogleAnalyticsFunction");
  });
});
