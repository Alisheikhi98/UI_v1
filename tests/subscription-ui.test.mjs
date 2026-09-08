import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CONTACT_INFO, getBaleContactUrl } from "../src/lib/contact-info.ts";
import { PLAN_CATALOG, UPGRADE_PLANS } from "../src/lib/plans.ts";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Subscription route is authenticated and does not invent an unsupported backend query", async () => {
  const [route, dashboard] = await Promise.all([
    readSource("../src/routes/dashboard.subscription.tsx"),
    readSource("../src/routes/dashboard.tsx"),
  ]);

  assert.match(route, /createFileRoute\("\/dashboard\/subscription"\)/);
  assert.match(route, /طرح فعلی/);
  assert.match(route, /وضعیت در دسترس نیست/);
  assert.match(route, /سرویس فعلی هنوز اطلاعات طرح، اعتبار و محدودیت‌های حساب را ارائه نمی‌کند/);
  assert.doesNotMatch(route, /useQuery|apiRequest|subscriptionApi|mockSubscription/);
  assert.match(dashboard, /<Outlet \/>/);
});

test("Landing and dashboard reuse one canonical Plan catalog", async () => {
  const [landing, subscription] = await Promise.all([
    readSource("../src/routes/index.tsx"),
    readSource("../src/routes/dashboard.subscription.tsx"),
  ]);

  assert.equal(PLAN_CATALOG.length, 4);
  assert.deepEqual(
    UPGRADE_PLANS.map(({ id }) => id),
    ["professional", "advanced", "enterprise"],
  );
  assert.equal(UPGRADE_PLANS.find(({ id }) => id === "professional")?.price, "۱٬۵۰۰٬۰۰۰");
  assert.equal(UPGRADE_PLANS.find(({ id }) => id === "advanced")?.price, "۲٬۵۰۰٬۰۰۰");
  assert.match(landing, /PLAN_CATALOG\.map/);
  assert.match(subscription, /UPGRADE_PLANS\.map/);
  assert.doesNotMatch(subscription, /پلن آزمایشی پایه/);
});

test("Upgrade selection reveals only an honest manual card-to-card flow", async () => {
  const source = await readSource("../src/routes/dashboard.subscription.tsx");

  assert.match(source, /اطلاعات پرداخت/);
  assert.match(source, /کارت‌به‌کارت/);
  assert.match(source, /رسید یا کد پیگیری/);
  assert.match(source, /در حال حاضر به‌صورت دستی از طریق پشتیبانی/);
  assert.match(source, /درخواست ارتقا/);
  assert.doesNotMatch(source, /شماره کارت:\s*\d|درگاه پرداخت|checkout|receipt.*Input/i);
});

test("Dashboard Header contains the compact Subscription action without Search or Contact UI", async () => {
  const source = await readSource("../src/components/header.tsx");

  assert.match(source, /to="\/dashboard\/subscription"/);
  assert.match(source, /aria-label="مشاهده طرح و اشتراک"/);
  assert.match(source, /وضعیت اشتراک در دسترس نیست/);
  assert.match(source, /max-w-44/);
  assert.doesNotMatch(source, /SearchInput|PhoneCall|ContactChannels|Popover/);
});

test("Sidebar exposes Subscription and routes Contact internally", async () => {
  const source = await readSource("../src/components/sidebar.tsx");

  assert.equal(CONTACT_INFO.primaryBaleId, "@amirmbd");
  assert.equal(CONTACT_INFO.primaryBaleUrl, "https://ble.ir/amirmbd");
  assert.equal(getBaleContactUrl("@AliSheikhi98"), "https://ble.ir/AliSheikhi98");
  assert.match(source, /name: "طرح و اشتراک", href: "\/dashboard\/subscription"/);
  assert.match(source, /name: "ارتباط با ما", href: "\/dashboard\/contact"/);
  assert.doesNotMatch(source, /externalHref|primaryBaleUrl|target="_blank"/);
  assert.match(source, /onClick=\{\(\) => setMobileMenuOpen\(false\)\}/);
});

test("Subscription cards and payment instructions use responsive, touch-friendly layouts", async () => {
  const source = await readSource("../src/routes/dashboard.subscription.tsx");

  assert.match(source, /md:grid-cols-2 xl:grid-cols-3/);
  assert.match(source, /sm:grid-cols-3/);
  assert.match(source, /className="w-full sm:w-auto"/);
  assert.match(source, /max-w-7xl/);
  assert.match(source, /dir="rtl"/);
});
