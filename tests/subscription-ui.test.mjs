import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CONTACT_INFO, getBaleContactUrl } from "../src/lib/contact-info.ts";
import { PAYMENT_DETAILS } from "../src/lib/payment-details.ts";
import { PAID_PLANS, PLAN_CATALOG, UPGRADE_PLANS } from "../src/lib/plans.ts";
import { repositoryQueryKeys } from "../src/lib/repository-query-keys.ts";
import {
  formatSubscriptionUsage,
  getSubscriptionPlanName,
  getSubscriptionValidityLabel,
  isSubscriptionExpiredError,
} from "../src/lib/subscription.ts";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

const subscription = (overrides = {}) => ({
  subscription_id: 11,
  school_id: 7,
  plan_code: "basic",
  plan_name: "Basic",
  status: "trial",
  starts_at: "2026-09-10T00:00:00Z",
  expires_at: "2026-09-15T00:00:00Z",
  remaining_days: 4,
  usage_date: "2026-09-11",
  active_teacher_count: 2,
  active_class_count: 3,
  total_generations_used: 1,
  daily_generations_used: 1,
  limits: {
    max_active_teachers: 60,
    max_active_classes: 20,
    max_total_generations_per_user: 20,
    max_daily_generations_per_user: 4,
  },
  excel_watermark: true,
  ...overrides,
});

test("Subscription route loads the authoritative school subscription", async () => {
  const [route, dashboard, header, query] = await Promise.all([
    readSource("../src/routes/dashboard.subscription.tsx"),
    readSource("../src/routes/dashboard.tsx"),
    readSource("../src/components/header.tsx"),
    readSource("../src/lib/api/subscription-query.ts"),
  ]);

  assert.match(route, /createFileRoute\("\/dashboard\/subscription"\)/);
  assert.match(route, /useSchoolSubscriptionQuery\(\)/);
  assert.match(header, /useSchoolSubscriptionQuery\(\)/);
  assert.match(query, /\/schools\/\$\{toApiId\(schoolId, "schoolId"\)\}\/subscription/);
  assert.match(query, /queryKey: repositoryQueryKeys\.schoolSubscription\(schoolId\)/);
  assert.match(query, /queryFn: \(\{ signal \}\)/);
  assert.doesNotMatch(`${route}\n${header}\n${query}`, /mockSubscription|PLAN_CATALOG\[0\]/);
  assert.match(dashboard, /<Outlet \/>/);
});

test("backend Trial is rendered as a real Trial rather than a missing subscription", () => {
  const trial = subscription();
  assert.equal(getSubscriptionPlanName(trial), "پلن آزمایشی");
  assert.notEqual(getSubscriptionPlanName(trial), "وضعیت در دسترس نیست");
});

test("an expired backend subscription is rendered as plan completion", async () => {
  const expiredError = {
    status: 409,
    details: {
      error: "SubscriptionExpiredError",
      detail: "The school subscription has expired.",
    },
  };

  assert.equal(isSubscriptionExpiredError(expiredError), true);
  assert.equal(
    isSubscriptionExpiredError({ status: 409, details: { error: "OtherError" } }),
    false,
  );
  assert.equal(isSubscriptionExpiredError({ status: 500 }), false);

  const [route, header] = await Promise.all([
    readSource("../src/routes/dashboard.subscription.tsx"),
    readSource("../src/components/header.tsx"),
  ]);
  assert.match(route, /isSubscriptionExpiredError\(error\)/);
  assert.match(header, /isSubscriptionExpiredError\(subscriptionQuery\.error\)/);
  assert.match(route, /اتمام پلن/);
  assert.match(header, /اتمام پلن/);
  assert.doesNotMatch(`${route}\n${header}`, /The school subscription has expired/);
});

test("paid plan identity is derived from the backend response", () => {
  assert.equal(
    getSubscriptionPlanName(
      subscription({ plan_code: "professional", plan_name: "Professional", status: "active" }),
    ),
    "پلن حرفه‌ای",
  );
  assert.equal(
    getSubscriptionPlanName(
      subscription({ plan_code: "advance", plan_name: "Advance", status: "active" }),
    ),
    "پلن پیشرفته",
  );
});

test("remaining validity and usage use backend values and effective limits", () => {
  const trial = subscription({ expires_at: "2099-01-01T00:00:00Z", remaining_days: 4 });
  assert.equal(getSubscriptionValidityLabel(trial), "۴ روز باقی‌مانده");
  assert.equal(
    getSubscriptionValidityLabel(subscription({ remaining_days: 0 })),
    "اعتبار به پایان رسیده",
  );
  assert.equal(formatSubscriptionUsage(3, 20), "۳ از ۲۰");
  assert.equal(formatSubscriptionUsage(3, null), "۳ (بدون محدودیت)");
});

test("dashboard header and page share one school-scoped query without duplicate API functions", async () => {
  const [route, header, dashboard, query] = await Promise.all([
    readSource("../src/routes/dashboard.subscription.tsx"),
    readSource("../src/components/header.tsx"),
    readSource("../src/routes/dashboard.index.tsx"),
    readSource("../src/lib/api/subscription-query.ts"),
  ]);
  assert.deepEqual(repositoryQueryKeys.schoolSubscription("7"), ["schools", "7", "subscription"]);
  assert.match(dashboard, /<Header title="داشبورد"/);
  assert.match(route, /useSchoolSubscriptionQuery\(\)/);
  assert.match(header, /useSchoolSubscriptionQuery\(\)/);
  assert.equal(query.match(/apiRequest<SchoolSubscriptionDto>/g)?.length, 1);
  assert.doesNotMatch(`${route}\n${header}`, /apiRequest|getSchoolSubscription/);
  assert.match(route, /در حال دریافت وضعیت اشتراک/);
  assert.match(header, /در حال دریافت وضعیت اشتراک/);
  assert.match(route, /وضعیت اشتراک در دسترس نیست/);
  assert.match(header, /وضعیت اشتراک در دسترس نیست/);
  assert.doesNotMatch(`${route}\n${header}`, /بدون اشتراک|فاقد اشتراک/);
});

test("Landing, subscription, and payment dialog reuse canonical plan metadata", async () => {
  const [landing, subscription, paymentDialog] = await Promise.all([
    readSource("../src/routes/index.tsx"),
    readSource("../src/routes/dashboard.subscription.tsx"),
    readSource("../src/components/subscription/payment-dialog.tsx"),
  ]);

  assert.equal(PLAN_CATALOG.length, 4);
  assert.deepEqual(
    UPGRADE_PLANS.map(({ id }) => id),
    ["professional", "advanced", "enterprise"],
  );
  assert.deepEqual(
    PAID_PLANS.map(({ id }) => id),
    ["professional", "advanced"],
  );
  assert.equal(PAID_PLANS[0]?.price, "۴٬۰۰۰٬۰۰۰");
  assert.equal(PAID_PLANS[1]?.price, "۶٬۰۰۰٬۰۰۰");
  assert.match(landing, /PLAN_CATALOG\.map/);
  assert.match(subscription, /UPGRADE_PLANS\.map/);
  assert.match(subscription, /PAID_PLANS\.find/);
  assert.match(paymentDialog, /plan\.title/);
  assert.match(paymentDialog, /plan\.price/);
  assert.doesNotMatch(paymentDialog, /۴٬۰۰۰٬۰۰۰|۶٬۰۰۰٬۰۰۰|پلن حرفه‌ای|پلن پیشرفته/);
});

test("paid dashboard plan selection opens a URL-backed payment dialog", async () => {
  const source = await readSource("../src/routes/dashboard.subscription.tsx");

  assert.match(source, /validateSearch/);
  assert.match(source, /isPaidPlanId\(search\.plan\)/);
  assert.match(source, /navigate\(\{ search: \{ plan: planId \} \}\)/);
  assert.match(source, /<PaymentDialog\s+plan=\{selectedPlan\}/);
  assert.match(source, /onClick=\{\(\) => selectPlan\(plan\.id\)\}/);
});

test("payment dialog renders exact details and reusable copy actions", async () => {
  const [dialog, clipboard] = await Promise.all([
    readSource("../src/components/subscription/payment-dialog.tsx"),
    readSource("../src/lib/copy-text.ts"),
  ]);

  assert.deepEqual(PAYMENT_DETAILS, {
    cardNumber: "6219861440706462",
    iban: "IR980560611828007309143402",
    accountHolder: "امیرحسین معبودی",
  });
  assert.match(dialog, /اطلاعات پرداخت/);
  assert.match(dialog, /PAYMENT_DETAILS\.cardNumber/);
  assert.match(dialog, /PAYMENT_DETAILS\.iban/);
  assert.match(dialog, /PAYMENT_DETAILS\.accountHolder/);
  assert.match(dialog, /شماره کارت بلو بانک:/);
  assert.match(dialog, /copyPaymentField\("cardNumber"\)/);
  assert.match(dialog, /copyPaymentField\("iban"\)/);
  assert.match(dialog, /کپی شد/);
  assert.match(clipboard, /navigator\.clipboard\.writeText\(value\)/);
  assert.match(clipboard, /document\.execCommand\("copy"\)/);
});

test("receipt action opens the canonical Bale chat in a new tab", async () => {
  const dialog = await readSource("../src/components/subscription/payment-dialog.tsx");

  assert.equal(CONTACT_INFO.primaryBaleId, "@amirmbd");
  assert.equal(CONTACT_INFO.primaryBaleUrl, "https://ble.ir/amirmbd");
  assert.equal(getBaleContactUrl("@AliSheikhi98"), "https://ble.ir/AliSheikhi98");
  assert.match(dialog, /href=\{CONTACT_INFO\.primaryBaleUrl\}/);
  assert.match(dialog, /target="_blank"/);
  assert.match(dialog, /rel="noopener noreferrer"/);
  assert.match(dialog, /ارسال رسید در بله/);
  assert.match(dialog, /آیدی بله/);
  assert.match(dialog, /\{CONTACT_INFO\.primaryBaleId\}/);
});

test("manual payment instructions never activate or confirm a subscription", async () => {
  const [dialog, subscription] = await Promise.all([
    readSource("../src/components/subscription/payment-dialog.tsx"),
    readSource("../src/routes/dashboard.subscription.tsx"),
  ]);
  const combined = `${dialog}\n${subscription}`;

  assert.match(combined, /پس از واریز وجه، تصویر رسید پرداخت را از طریق پیام‌رسان بله/);
  assert.doesNotMatch(
    combined,
    /پرداخت موفق|activateSubscription|setSubscription|subscriptionMutation/,
  );
});

test("Landing protects paid upgrades and routes authenticated users with the selected plan", async () => {
  const source = await readSource("../src/routes/index.tsx");

  assert.match(source, /useAuthSession\(\)/);
  assert.match(source, /authSession\.status === "authenticated"/);
  assert.match(source, /to: "\/dashboard\/subscription", search: \{ plan: planId \}/);
  assert.match(source, /authSession\.status === "unauthenticated"/);
  assert.match(source, /برای ادامه وارد حساب شوید/);
  assert.match(source, /برای خرید یا ارتقای طرح، ابتدا وارد حساب کاربری خود شوید یا ثبت‌نام کنید/);
  assert.match(
    source,
    /<Link to="\/auth\/login" search=\{\{ redirect: subscriptionDestination \}\}>/,
  );
  assert.match(source, /<Link to="\/auth\/register">ثبت‌نام<\/Link>/);
  assert.match(source, />\s*انصراف\s*<\/Button>/);
});

test("payment and authentication dialogs remain mobile-friendly and RTL", async () => {
  const [subscription, dialog, landing] = await Promise.all([
    readSource("../src/routes/dashboard.subscription.tsx"),
    readSource("../src/components/subscription/payment-dialog.tsx"),
    readSource("../src/routes/index.tsx"),
  ]);

  assert.match(subscription, /md:grid-cols-2 xl:grid-cols-3/);
  assert.match(dialog, /dir="rtl"/);
  assert.match(dialog, /break-all/);
  assert.match(dialog, /sm:max-w-xl/);
  assert.match(dialog, /sm:justify-between/);
  assert.match(dialog, /self-start sm:self-auto/);
  assert.match(landing, /sm:max-w-md/);
});
