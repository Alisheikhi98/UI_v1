import type { SchoolSubscriptionDto } from "./api/dtos.ts";

const PERSIAN_PLAN_NAMES = {
  basic: "پلن پایه",
  professional: "پلن حرفه‌ای",
  advance: "پلن پیشرفته",
  enterprise: "پلن سازمانی",
} as const;

export const SUBSCRIPTION_STATUS_LABELS = {
  trial: "آزمایشی",
  active: "فعال",
  cancelled: "لغوشده",
  expired: "منقضی",
} as const;

export function isSubscriptionExpiredError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { status?: unknown; details?: unknown };
  if (candidate.status !== 409 || !candidate.details || typeof candidate.details !== "object") {
    return false;
  }

  return (candidate.details as { error?: unknown }).error === "SubscriptionExpiredError";
}

export function getSubscriptionPlanName(subscription: SchoolSubscriptionDto): string {
  if (subscription.status === "trial") return "پلن آزمایشی";
  return PERSIAN_PLAN_NAMES[subscription.plan_code] ?? subscription.plan_name;
}

export function formatSubscriptionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "نامشخص";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatSubscriptionLimit(value: number | null): string {
  return value === null ? "بدون محدودیت" : value.toLocaleString("fa-IR");
}

export function formatSubscriptionUsage(used: number, limit: number | null): string {
  const localizedUsage = used.toLocaleString("fa-IR");
  return limit === null
    ? `${localizedUsage} (بدون محدودیت)`
    : `${localizedUsage} از ${formatSubscriptionLimit(limit)}`;
}

export function getSubscriptionValidityLabel(subscription: SchoolSubscriptionDto): string {
  const remainingDays = Math.max(0, subscription.remaining_days);
  return remainingDays > 0
    ? `${remainingDays.toLocaleString("fa-IR")} روز باقی‌مانده`
    : "اعتبار به پایان رسیده";
}
