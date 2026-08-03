import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ApiError } from "../src/lib/api/client.ts";
import { buildLoginForm, buildRegistrationPayload } from "../src/lib/api/auth.ts";
import {
  getAuthFieldErrors,
  getLoginErrorMessage,
  getRegistrationErrorMessage,
} from "../src/lib/auth-errors.ts";
import { buildLoginUrl } from "../src/lib/auth-session.ts";

const readSource = async (relativePath) =>
  readFile(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

test("Registration sends only the authoritative FastAPI fields", () => {
  assert.deepEqual(
    buildRegistrationPayload({
      username: "manager",
      full_name: "School Manager",
      phone_number: "09123456789",
      email: undefined,
      password: "StrongPass1",
    }),
    {
      username: "manager",
      full_name: "School Manager",
      phone_number: "09123456789",
      email: null,
      password: "StrongPass1",
    },
  );
});

test("Login uses the OAuth2 username/password form contract", () => {
  const form = buildLoginForm("manager name", "p&ssword");
  assert.equal(form.get("username"), "manager name");
  assert.equal(form.get("password"), "p&ssword");
  assert.equal([...form.keys()].sort().join(","), "password,username");
});

test("FastAPI Registration validation and duplicate conflicts map clearly", () => {
  const validation = new ApiError("invalid", 422, undefined, [
    { path: "username", message: "String should have at least 3 characters" },
    { path: "phone_number", message: "String should match pattern" },
  ]);
  assert.deepEqual(getAuthFieldErrors(validation), {
    username: "String should have at least 3 characters",
    phone_number: "String should match pattern",
  });
  assert.equal(
    getRegistrationErrorMessage(new ApiError("Username already registered", 409)),
    "این نام کاربری قبلاً ثبت شده است.",
  );
});

test("invalid credentials and Retry-After receive Login-specific messages", () => {
  assert.equal(
    getLoginErrorMessage(new ApiError("Invalid username or password", 401)),
    "نام کاربری یا رمز عبور نادرست است.",
  );
  assert.match(getLoginErrorMessage(new ApiError("limited", 429, undefined, [], 12)), /12/);
});

test("Login validates /users/me before navigation and stores one canonical token", async () => {
  const authSource = await readSource("../src/lib/auth-session.ts");
  const tokenSource = await readSource("../src/lib/auth-token.ts");
  const loginRoute = await readSource("../src/routes/auth.login.tsx");
  assert.match(authSource, /await loginUser\(username, password\)/);
  assert.match(authSource, /setAccessToken\(response\.access_token\)/);
  assert.match(authSource, /await loadAuthenticatedUser\(\)/);
  assert.match(loginRoute, /await loginAndBootstrap/);
  assert.match(loginRoute, /await navigate/);
  assert.match(tokenSource, /ACCESS_TOKEN_STORAGE_KEY = "access_token"/);
  assert.equal((tokenSource.match(/localStorage\.setItem/g) ?? []).length, 1);
});

test("session restoration and protected/public route guards are present", async () => {
  const dashboardSource = await readSource("../src/routes/dashboard.tsx");
  const loginSource = await readSource("../src/routes/auth.login.tsx");
  const registerSource = await readSource("../src/routes/auth.register.tsx");
  const publicBoundarySource = await readSource("../src/components/auth/public-only-auth.tsx");
  assert.match(dashboardSource, /beforeLoad/);
  assert.match(dashboardSource, /!getAccessToken\(\)/);
  assert.match(dashboardSource, /useAuthenticatedUser\(\)/);
  assert.match(dashboardSource, /userQuery\.isPending/);
  assert.match(loginSource, /validateStoredSession/);
  assert.match(registerSource, /validateStoredSession/);
  assert.match(loginSource, /PublicOnlyAuth/);
  assert.match(registerSource, /PublicOnlyAuth/);
  assert.match(publicBoundarySource, /useAuthenticatedUser\(\)/);
  assert.match(publicBoundarySource, /authenticatedDestination = "\/dashboard"/);
  assert.match(publicBoundarySource, /navigate\(\{ to: authenticatedDestination/);
  assert.match(loginSource, /throw redirect\(\{ to: \(search\.redirect \?\? "\/dashboard"\)/);
  assert.match(registerSource, /throw redirect\(\{ to: "\/dashboard" \}\)/);
});

test("protected redirects preserve a safe encoded dashboard destination", () => {
  assert.equal(
    buildLoginUrl("/dashboard/schools?tab=days"),
    "/auth/login?redirect=%2Fdashboard%2Fschools%3Ftab%3Ddays",
  );
});

test("Logout and protected 401 share centralized session cleanup", async () => {
  const dashboardSource = await readSource("../src/routes/dashboard.tsx");
  const rootSource = await readSource("../src/routes/__root.tsx");
  const clientSource = await readSource("../src/lib/api/client.ts");
  const sessionSource = await readSource("../src/lib/auth-session.ts");
  assert.match(dashboardSource, /clearAuthenticatedSession\(queryClient\)/);
  assert.match(rootSource, /clearAuthenticatedSession\(queryClient\)/);
  assert.match(clientSource, /requiresAuth && response\.status === 401/);
  assert.match(sessionSource, /clearAccessToken\(\)/);
  assert.match(sessionSource, /setActiveSchoolId\(null\)/);
  assert.match(sessionSource, /queryClient\.clear\(\)/);
});

test("failed public Login cannot emit protected-session recovery", async () => {
  const clientSource = await readSource("../src/lib/api/client.ts");
  const authApiSource = await readSource("../src/lib/api/auth.ts");
  assert.match(authApiSource, /publicApiRequest<TokenResponse>/);
  assert.match(clientSource, /if \(requiresAuth && response\.status === 401/);
});

test("mock Login exists only behind the literal explicit mock-mode flag", async () => {
  const sessionSource = await readSource("../src/lib/auth-session.ts");
  const loginRoute = await readSource("../src/routes/auth.login.tsx");
  assert.match(sessionSource, /VITE_USE_MOCK_API === "true"/);
  assert.match(sessionSource, /if \(useMockAuthentication\)/);
  assert.match(sessionSource, /setAccessToken\("dev-mock-token"\)/);
  assert.doesNotMatch(loginRoute, /dev-mock-token/);
});
