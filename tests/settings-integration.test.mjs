import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ApiError } from "../src/lib/api/client.ts";
import { buildPasswordChangePayload, buildProfileUpdatePayload } from "../src/lib/api/auth.ts";
import { copyReferralCode, getReferralCode } from "../src/lib/referral-code.ts";
import {
  getSettingsErrorMessage,
  getSettingsFieldErrors,
  validatePasswordChange,
} from "../src/lib/settings-errors.ts";

const readSource = async (relativePath) =>
  (await readFile(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8")).replaceAll(
    "\r\n",
    "\n",
  );

test("Settings remains protected by the dashboard authentication boundary", async () => {
  const settingsSource = await readSource("../src/routes/dashboard.settings.tsx");
  const dashboardSource = await readSource("../src/routes/dashboard.tsx");
  assert.match(settingsSource, /createFileRoute\("\/dashboard\/settings"\)/);
  assert.match(dashboardSource, /beforeLoad/);
  assert.match(dashboardSource, /!getAccessToken\(\)/);
});

test("profile and password payloads contain only FastAPI-supported fields", () => {
  assert.deepEqual(
    buildProfileUpdatePayload({
      username: "manager",
      full_name: "School Manager",
      phone_number: "09123456789",
      email: undefined,
      referral_code: "SHOULD-NOT-BE-SENT",
    }),
    {
      username: "manager",
      full_name: "School Manager",
      phone_number: "09123456789",
      email: null,
    },
  );
  assert.deepEqual(
    buildPasswordChangePayload({ current_password: "OldPass1", new_password: "NewPass2" }),
    { current_password: "OldPass1", new_password: "NewPass2" },
  );
});

test("authenticated profile maps the authoritative referral code without another request", async () => {
  const apiSource = await readSource("../src/lib/api/auth.ts");
  const sessionSource = await readSource("../src/lib/auth-session.ts");
  const routeSource = await readSource("../src/routes/dashboard.settings.tsx");

  assert.match(apiSource, /referral_code: string/);
  assert.match(apiSource, /getCurrentUser[\s\S]*"\/users\/me"/);
  assert.match(routeSource, /userQuery\.data\.referral_code/);
  assert.doesNotMatch(routeSource, /users\/me\/referral|useQuery|apiRequest/);
  assert.doesNotMatch(sessionSource, /users\/me\/referral/);
});

test("Referral Code is a separate read-only Profile card with a safe empty state", async () => {
  const source = await readSource("../src/routes/dashboard.settings.tsx");

  assert.match(source, /data-testid="referral-code-card"/);
  assert.match(source, /<CardTitle className="text-base">کد معرف<\/CardTitle>/);
  assert.match(source, /<code[\s\S]*\{code\}[\s\S]*<\/code>/);
  assert.match(source, /کد معرف برای این حساب ثبت نشده است/);
  assert.match(source, /aria-label="کپی کد معرف"/);
  assert.match(source, /overflow-hidden/);
  assert.match(source, /flex min-w-0 flex-col gap-3 sm:flex-row/);
  assert.match(source, /w-full shrink-0 gap-2 sm:w-auto/);
  assert.match(source, /break-all text-center/);
  assert.doesNotMatch(source, /ProfileField[\s\S]{0,150}referral/);
});

test("Referral Code copy uses only the canonical value and fails safely", async () => {
  const copiedValues = [];
  const clipboard = {
    async writeText(value) {
      copiedValues.push(value);
    },
  };

  assert.equal(getReferralCode("  ABC2345678  "), "ABC2345678");
  assert.equal(getReferralCode("  "), null);
  assert.equal(getReferralCode(null), null);
  assert.equal(await copyReferralCode("  ABC2345678  ", clipboard), true);
  assert.deepEqual(copiedValues, ["ABC2345678"]);
  assert.equal(
    await copyReferralCode("ABC2345678", {
      async writeText() {
        throw new Error("clipboard denied");
      },
    }),
    false,
  );
});

test("Referral Code copy feedback is localized and inline", async () => {
  const source = await readSource("../src/routes/dashboard.settings.tsx");
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /"کپی شد"/);
  assert.match(source, /"کپی کد معرف انجام نشد\. دوباره تلاش کنید\."/);
  assert.doesNotMatch(source, /toast\.(success|error)\([^)]*کپی/);
});

test("Settings loads and updates the canonical authenticated-user query", async () => {
  const routeSource = await readSource("../src/routes/dashboard.settings.tsx");
  const sessionSource = await readSource("../src/lib/auth-session.ts");
  const apiSource = await readSource("../src/lib/api/auth.ts");
  assert.match(routeSource, /useAuthenticatedUser\(\)/);
  assert.match(apiSource, /apiRequest<AuthenticatedUser>\("\/users\/me"/);
  assert.match(apiSource, /apiRequest<void>\("\/users\/me\/password"/);
  assert.match(sessionSource, /await updateCurrentUser\(input\)/);
  assert.match(sessionSource, /invalidateQueries\(\{/);
  assert.match(sessionSource, /queryClient\.fetchQuery\(\{/);
});

test("Profile uses the approved field order and unsupported Settings sections are removed", async () => {
  const source = await readSource("../src/routes/dashboard.settings.tsx");
  assert.ok(source.indexOf('id="profileFullName"') < source.indexOf('id="profilePhone"'));
  assert.ok(source.indexOf('id="profilePhone"') < source.indexOf('id="profileUsername"'));
  assert.doesNotMatch(
    source,
    /schoolInfo|Building2|Avatar|تغییر تصویر|جلسات فعال|preferences|notifications|اعلان‌ها/,
  );
});

test("FastAPI profile validation issues map to localized field errors", () => {
  const error = new ApiError("invalid", 422, undefined, [
    { path: "full_name", message: "String should have at least 3 characters" },
    { path: "phone_number", message: "String should match pattern" },
  ]);
  assert.deepEqual(getSettingsFieldErrors(error), {
    full_name: "نام و نام خانوادگی باید بین ۳ تا ۱۰۰ نویسه باشد.",
    phone_number: "شماره تلفن باید یک شماره موبایل معتبر ایران باشد.",
  });
});

test("profile conflicts are localized and attached to the affected field", () => {
  const cases = [
    ["Username already registered", "username", "این نام کاربری قبلاً ثبت شده است."],
    ["Phone number already registered", "phone_number", "این شماره تلفن قبلاً ثبت شده است."],
    ["Email already registered", "email", "این ایمیل قبلاً ثبت شده است."],
  ];
  for (const [message, field, localized] of cases) {
    const error = new ApiError(message, 409, { detail: message });
    assert.deepEqual(getSettingsFieldErrors(error), { [field]: localized });
    assert.equal(getSettingsErrorMessage(error), localized);
  }
  assert.equal(
    getSettingsErrorMessage(new ApiError("Database conflict", 409)),
    "اطلاعات واردشده با اطلاعات حساب دیگری تداخل دارد.",
  );
});

test("password confirmation and FastAPI strength rules are validated before submission", () => {
  assert.deepEqual(validatePasswordChange("OldPass1", "NewPass2", "Different3"), {
    confirm_password: "تکرار رمز عبور با رمز جدید یکسان نیست.",
  });
  assert.ok(validatePasswordChange("", "weak", "weak").current_password);
  assert.ok(validatePasswordChange("OldPass1", "weak", "weak").new_password);
  assert.deepEqual(validatePasswordChange("OldPass1", "NewPass2", "NewPass2"), {});
});

test("password success clears fields only after the mutation and failures stay localized", async () => {
  const source = await readSource("../src/routes/dashboard.settings.tsx");
  assert.ok(
    source.indexOf("await changePassword.mutateAsync") <
      source.indexOf('setPasswords({ current: "", next: "", confirm: "" })'),
  );
  assert.match(source, /catch \(error\) \{\s*setPasswordErrors/);
  assert.equal(
    getSettingsErrorMessage(new ApiError("Current password is incorrect", 400)),
    "رمز عبور فعلی نادرست است.",
  );
  assert.deepEqual(getSettingsFieldErrors(new ApiError("Current password is incorrect", 400)), {
    current_password: "رمز عبور فعلی نادرست است.",
  });
  assert.equal(
    getSettingsErrorMessage(new ApiError("forbidden", 403)),
    "اجازه انجام این عملیات را ندارید.",
  );
});

test("Settings errors never expose raw backend or network details", () => {
  assert.equal(
    getSettingsErrorMessage(new Error("postgresql password_hash constraint")),
    "خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.",
  );
  assert.equal(
    getSettingsErrorMessage(new ApiError("fetch failed: private host", 0)),
    "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.",
  );
  assert.equal(
    getSettingsErrorMessage(new ApiError("internal traceback", 500)),
    "خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.",
  );
});

test("pending mutations prevent duplicate submissions and protect form controls", async () => {
  const source = await readSource("../src/routes/dashboard.settings.tsx");
  assert.match(source, /if \(updateProfile\.isPending\) return/);
  assert.match(source, /if \(changePassword\.isPending\) return/);
  assert.ok((source.match(/disabled=\{updateProfile\.isPending\}/g) ?? []).length >= 2);
  assert.ok((source.match(/disabled=\{changePassword\.isPending\}/g) ?? []).length >= 4);
});

test("password values remain ephemeral and API mode has no mock fallback", async () => {
  const routeSource = await readSource("../src/routes/dashboard.settings.tsx");
  const sessionSource = await readSource("../src/lib/auth-session.ts");
  assert.doesNotMatch(routeSource, /localStorage|sessionStorage|console\.(log|debug)/);
  assert.match(sessionSource, /VITE_USE_MOCK_API === "true"/);
  assert.match(sessionSource, /if \(useMockAuthentication\)/);
  assert.match(sessionSource, /else \{\s*await updateCurrentUser\(input\)/);
  assert.doesNotMatch(
    sessionSource,
    /useChangeAuthenticatedUserPassword[\s\S]*clearAuthenticatedSession/,
  );
});
