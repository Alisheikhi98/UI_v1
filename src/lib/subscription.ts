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

export function getSubscriptionPlanName(subscription: SchoolSubscriptionDto): string {
  if (subscription.status === "trial") return "پلن آزمایشی";
  return PERSIAN_PLAN_NAMES[subscription.plan_code] ?? subscription.plan_name;
}

export function calculateSubscriptionRemainingDays(
  expiresAt: string,
  now: Date = new Date(),
): number {
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return 0;
  return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000));
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

export function getSubscriptionValidityLabel(
  subscription: SchoolSubscriptionDto,
  now: Date = new Date(),
): string {
  const remainingDays = calculateSubscriptionRemainingDays(subscription.expires_at, now);
  return remainingDays > 0
    ? `${remainingDays.toLocaleString("fa-IR")} روز باقی‌مانده`
    : "اعتبار به پایان رسیده";
}
