# Frontend Scheduling Application Audit

**Project:** `lovable-language-bridge`
**Audit date:** 2026-07-20
**Scope:** Frontend structure, TypeScript/React syntax, scheduling logic, and backend connectivity. This was a read-only code review except for creation of this report.

## Executive summary

The project is a TanStack Start/React 19 dashboard prototype with a coherent route and component layout, but it is **not currently production-ready or correctly connected to a scheduling backend**.

The production build fails because the schools route imports a module from the wrong path. More importantly, the scheduling workflow is a UI simulation: classes, subjects, teachers, time slots, generated schedules, editing, and PDF export are all mock or local-only. Authentication is internally inconsistent: the login screen accepts any credentials and writes a fake token, while the unused teacher API looks for a different token key. The dashboard has no authentication guard.

Overall assessment: **prototype / partially integrated frontend; high risk for backend integration and data integrity**.

## Application structure

| Area                  | Main files                                                                                                        | Current role                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Application bootstrap | `src/start.ts`, `src/server.ts`, `src/router.tsx`, `src/routes/__root.tsx`                                        | TanStack Start client/server and router setup                           |
| Dashboard shell       | `src/routes/dashboard.tsx`, `src/components/sidebar.tsx`, `src/components/header.tsx`                             | Shared dashboard layout and navigation                                  |
| Scheduling            | `src/routes/dashboard.generator.tsx`, `src/routes/dashboard.timetable.tsx`, `src/lib/data.ts`, `src/lib/types.ts` | Simulated schedule generation and timetable display                     |
| Scheduling inputs     | `src/routes/dashboard.teachers.tsx`, `dashboard.classes.tsx`, `dashboard.subjects.tsx`, `dashboard.schools.tsx`   | CRUD-like screens for scheduling entities                               |
| Backend clients       | `src/lib/api/auth.ts`, `src/lib/api/teachers.ts`                                                                  | Standalone auth and teacher fetch helpers; currently not used by routes |
| Local persistence     | `src/lib/api/schools-store.ts`                                                                                    | Browser `localStorage` store for schools and period configuration       |
| UI primitives         | `src/components/ui/*`                                                                                             | Radix/shadcn-style reusable components                                  |

The route organization is understandable and feature-oriented. However, data access is fragmented between route-local state, shared mock data, local storage, direct `fetch` calls, and unused API helper modules. There is no single backend client, query/cache layer, authenticated session abstraction, or canonical scheduling domain model.

## Findings

### Critical

#### 1. Production build is broken by an invalid import

- `src/routes/dashboard.schools.tsx:48` imports `@/lib/schools-store`.
- The actual file is `src/lib/api/schools-store.ts`.
- `npm.cmd run build` transforms the client modules and then fails with `ENOENT` for `src/lib/schools-store`.

**Impact:** the application cannot produce a deployable production bundle.

**Recommendation:** change the import to `@/lib/api/schools-store` (or move the module and consistently update imports), then rerun the build.

#### 2. Schedule generation is entirely simulated and never reaches the backend

- `src/routes/dashboard.generator.tsx:53-75` advances randomized progress through timers and marks the operation successful without sending a request or producing/persisting a schedule.
- The selected grade, class, time slots, and constraint IDs are not submitted anywhere.
- The “success” action only navigates to the timetable page.
- `src/routes/dashboard.timetable.tsx:24` independently creates a random schedule using `generateMockSchedule()`.
- `src/lib/data.ts:92-111` randomly assigns subjects per cell without checking teacher availability, class collisions, weekly-hour requirements, room constraints, consecutive-period rules, or the selected generator inputs.

**Impact:** users can receive a success message even though no schedule was generated, validated, saved, or returned by the backend. The timetable shown afterward is unrelated random data.

**Recommendation:** define a scheduling request/response contract, POST generator inputs to the backend, persist a returned schedule ID/version, and load that exact schedule on the timetable route. Treat constraint violations returned by the solver as structured errors, not generic toasts.

### High

#### 3. Login bypasses the real auth API and accepts every credential pair

- `src/routes/auth.login.tsx:24-40` uses a timer, writes `access_token = fake-token`, and navigates to the dashboard.
- `src/lib/api/auth.ts:3-20` contains a real `loginUser()` implementation, but no route imports the API module.
- `src/routes/dashboard.tsx:4-16` has no `beforeLoad`, session validation, or redirect guard.

**Impact:** protected screens are publicly accessible and the UI reports successful authentication without backend verification.

**Recommendation:** call the real login endpoint, validate and store the returned session consistently (prefer secure HTTP-only cookies where backend architecture permits), add a dashboard route guard, and implement logout/session expiry handling.

#### 4. API configuration and token storage are inconsistent

- `src/lib/api/auth.ts:1` hard-codes `http://localhost:8000`.
- `src/routes/auth.register.tsx:71` duplicates the same hard-coded URL instead of using `registerUser()`.
- `src/lib/api/teachers.ts:23` uses `VITE_API_BASE_URL`, with an empty-string fallback that silently changes requests to same-origin `/teachers`.
- Login writes `access_token` (`src/routes/auth.login.tsx:29`), while teacher requests read `token` (`src/lib/api/teachers.ts:28`).

**Impact:** environments will behave differently, authenticated teacher calls will omit the token, and deployments are coupled to a developer machine URL.

**Recommendation:** create one configured API client, one token/session policy, and one error decoder. Fail clearly when required configuration is missing. Avoid duplicating endpoint URLs in route components.

#### 5. Existing backend helpers are disconnected from the UI

- A repository-wide search finds no imports of `src/lib/api/auth.ts` or `src/lib/api/teachers.ts` from application routes/components.
- Teachers, classes, and subjects initialize from `src/lib/data.ts` and mutate only React component state (`dashboard.teachers.tsx:222`, `dashboard.classes.tsx:167`, `dashboard.subjects.tsx:177`).
- Dialog submissions deliberately wait 800 ms and then mutate local arrays; refresh discards changes.
- No API clients exist for classes, subjects, schedules, constraints, or timetable export.

**Impact:** the backend cannot be the source of truth for the data needed by the scheduler, and UI changes are ephemeral.

**Recommendation:** introduce typed CRUD clients (or generated clients from an OpenAPI schema), then connect them through TanStack Query loaders/mutations with loading, retry, invalidation, and error states.

#### 6. Teacher domain types conflict

- `src/lib/types.ts:1-9` models a teacher with `email`, `subjects`, and `status`.
- `src/routes/dashboard.teachers.tsx:97-171` reads and writes `personnel_code`, which is not declared by that interface.
- `src/lib/api/teachers.ts:4-19` declares a second incompatible `Teacher` model using `code`, `active`, and `school_id`.

**Impact:** frontend state, forms, and backend payloads do not share a contract. This invites TypeScript failures and lossy mappings when API wiring is attempted.

**Recommendation:** keep one canonical domain/API model or explicitly define DTO-to-view-model adapters. Align naming (`personnel_code` vs. `code`, `status` vs. `active`) with the actual backend schema.

#### 7. Timetable editing and export controls are non-functional

- `src/routes/dashboard.timetable.tsx:22,70-83` only toggles a visual edit mode.
- Empty and occupied timetable cells have edit styling but no mutation handlers (`:138-150`).
- `handleExport()` at `:30-35` only shows a toast; it creates no PDF or download.

**Impact:** the interface advertises capabilities that do not exist, which can cause users to assume changes or exports were saved.

**Recommendation:** disable or label prototype controls until implemented. Add explicit schedule-cell mutations with conflict revalidation, optimistic rollback, and a real export endpoint or client-side PDF generator.

### Medium

#### 8. School data is browser-local and not associated with an authenticated user

- `src/lib/api/schools-store.ts:79-169` stores all schools and the active school ID in `localStorage`.
- There is no backend sync, tenant/user namespace, schema validation, migration logic beyond a versioned key, or authorization boundary.

**Impact:** school configuration is lost on another browser/device and can bleed between users sharing a browser profile. Malformed stored JSON is silently replaced by an empty list.

**Recommendation:** persist schools server-side and scope them through the authenticated tenant. If offline drafts are required, validate cached data with Zod and reconcile it explicitly.

#### 9. Period calculation lacks input and boundary validation

- `src/lib/api/schools-store.ts:49-75` accepts numeric values without validating finiteness, positive durations, overlaps, or whether the school day exceeds midnight.
- `fmt()` wraps hours with `% 24`, so a period after midnight appears to restart at `00:xx` rather than reporting an invalid schedule.
- The school form only enforces `min={1}` for period count; class and break duration inputs have no minimums.
- Manual period editing does not verify `start < end`, chronological order, or collisions.

**Impact:** invalid period definitions can enter scheduling inputs and later make solver results ambiguous or impossible.

**Recommendation:** validate the full timing object and manually edited periods before saving. Reject non-positive durations, overlapping/reversed periods, invalid `HH:mm`, and day overflow according to an explicit business rule.

#### 10. Error handling loses useful backend information

- `src/lib/api/auth.ts:15-17` replaces any non-2xx login response with `Login failed` without parsing backend detail.
- Teacher API helpers throw generic strings and discard status codes and response bodies.
- Registration assumes every error response is JSON (`src/routes/auth.register.tsx:79-81`), which can itself throw for HTML/plain-text/proxy errors.

**Impact:** users and operators cannot distinguish validation, authorization, conflict, server, and network failures.

**Recommendation:** use a typed `ApiError` containing HTTP status, safe backend detail, correlation/request ID, and field-level validation errors. Handle network and response-parsing failures separately.

### Low / maintainability

#### 11. Lint configuration currently makes the repository fail lint at scale

`npm.cmd run lint` fails with extensive Prettier findings, dominated by CRLF deletion and style differences (quote/semicolon/wrapping rules), across configuration and source files.

**Impact:** CI cannot use lint as a meaningful quality gate, and semantic lint errors are buried under formatting noise.

**Recommendation:** align `.prettierrc`, `.editorconfig`, and Git line-ending policy for Windows development; run a dedicated formatting commit; then address remaining semantic lint errors separately.

#### 12. Scheduling models rely on display names instead of stable IDs

- `Subject.assignedTeacher` and `Class.classTeacher` in `src/lib/types.ts` are strings.
- Mock schedule entries propagate teacher names rather than teacher IDs.

**Impact:** renaming a teacher breaks relationships and duplicate names are ambiguous.

**Recommendation:** use IDs for all relationships (`teacherId`, `classId`, `subjectId`, `timeSlotId`) and resolve display labels at the view boundary.

## Backend connection matrix

| Capability               | UI implementation                      | Backend status                                                      |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------- |
| Register                 | Direct `fetch` to hard-coded localhost | Partially connected; duplicated client and fragile error handling   |
| Login                    | Timer + fake token                     | Not connected                                                       |
| Session/route protection | None                                   | Not connected                                                       |
| Schools and periods      | `localStorage` hook                    | Not connected                                                       |
| Teachers                 | Mock React state                       | API helper exists but is unused and contract/token naming conflicts |
| Classes                  | Mock React state                       | No client found                                                     |
| Subjects                 | Mock React state                       | No client found                                                     |
| Generate schedule        | Timer/progress simulation              | No client found                                                     |
| Load timetable           | Random in-memory generation            | No client found                                                     |
| Edit timetable           | Visual mode only                       | No client found                                                     |
| Export PDF               | Toast only                             | No client found                                                     |

## Recommended implementation order

1. Fix the broken schools-store import and establish a passing production build.
2. Confirm the backend OpenAPI/schema and normalize frontend DTOs, IDs, endpoint prefixes, auth response shape, and error format.
3. Add one environment-configured API client and one session mechanism; connect login/register and protect dashboard routes.
4. Connect schools, teachers, classes, subjects, periods, and constraints as persisted scheduling inputs.
5. Define and implement `POST /schedules/generate` (or equivalent), including job/progress semantics if solving is asynchronous.
6. Load schedules by stable ID/version; implement validated edits and conflict responses.
7. Implement export, then add contract tests, route tests, scheduling invariants, and end-to-end authentication/generation tests.
8. Normalize formatting/line endings and make build, type-check, lint, and tests required CI checks.

## Suggested API contract shape

At minimum, generation should send stable identifiers and explicit constraints rather than display strings:

```ts
type GenerateScheduleRequest = {
  schoolId: string;
  classIds: string[];
  timeSlotIds: string[];
  constraintIds: string[];
  expectedInputVersion: string;
};

type GenerateScheduleResponse = {
  scheduleId: string;
  version: string;
  status: "completed" | "queued";
  violations: Array<{
    code: string;
    message: string;
    entityIds: string[];
  }>;
};
```

If generation is asynchronous, the frontend should poll or subscribe to a real job status and cancel polling on unmount. Random client-side progress should not represent backend completion.

## Verification performed

- Inspected route, component, model, mock-data, local-store, auth, and teacher API files.
- Searched all TypeScript/TSX sources for network calls, mock data, local storage, timers, random generation, and API module usage.
- Ran `npm.cmd run build` outside the restricted file sandbox: **failed** on the incorrect `@/lib/schools-store` import after 1,958 modules transformed.
- Ran `npm.cmd run lint`: **failed** with extensive Prettier/line-ending findings.
- A standalone TypeScript check could not be run because the installed dependencies do not expose a local `tsc` binary, and `npx` attempted a blocked registry download. The Vite build failure occurs before a complete production bundle can be verified.

## Conclusion

The UI has a useful prototype structure and covers the expected scheduling screens, but its apparent end-to-end workflow is currently deceptive: nearly every scheduling action is local, random, or cosmetic. The first milestone should be a buildable application with real authentication and a unified backend contract; only then should schedule generation, editing, and export be presented as working capabilities.
