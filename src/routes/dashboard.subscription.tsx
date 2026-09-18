import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, CreditCard, Gauge, RefreshCw, Users } from "lucide-react";
import { Header } from "@/components/header";
import { PaymentDialog } from "@/components/subscription/payment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolSubscriptionQuery } from "@/lib/api/subscription-query";
import type { SchoolSubscriptionDto } from "@/lib/api/dtos";
import { withAppName } from "@/lib/branding";
import { isPaidPlanId, PAID_PLANS, UPGRADE_PLANS } from "@/lib/plans";
import {
  formatSubscriptionDate,
  formatSubscriptionUsage,
  getSubscriptionPlanName,
  getSubscriptionValidityLabel,
  isSubscriptionExpiredError,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/lib/subscription";

interface SubscriptionSearch {
  plan?: (typeof PAID_PLANS)[number]["id"];
}

export const Route = createFileRoute("/dashboard/subscription")({
  validateSearch: (search: Record<string, unknown>): SubscriptionSearch => ({
    plan: isPaidPlanId(search.plan) ? search.plan : undefined,
  }),
  head: () => ({ meta: [{ title: withAppName("طرح و اشتراک") }] }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const selectedPlan = PAID_PLANS.find((plan) => plan.id === search.plan) ?? null;
  const subscriptionQuery = useSchoolSubscriptionQuery();

  function selectPlan(planId: (typeof PAID_PLANS)[number]["id"]) {
    void navigate({ search: { plan: planId } });
  }

  function closePaymentDialog() {
    void navigate({ search: {}, replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col" dir="rtl">
      <Header
        title="طرح و اشتراک"
        description="وضعیت اشتراک و گزینه‌های ارتقای چیدمان را در یک مسیر بررسی کنید."
      />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <section aria-labelledby="current-plan-title">
            <CurrentSubscriptionCard
              subscription={subscriptionQuery.data}
              isLoading={subscriptionQuery.isLoading}
              error={subscriptionQuery.error}
              onRetry={() => void subscriptionQuery.refetch()}
            />
          </section>

          <section aria-labelledby="upgrade-plans-title">
            <div className="mb-4">
              <h2 id="upgrade-plans-title" className="text-xl font-bold">
                طرح‌های قابل ارتقا
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                طرح مناسب مدرسه را انتخاب کنید تا راهنمای پرداخت و ارتباط با پشتیبانی نمایش داده
                شود.
              </p>
            </div>

            <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
              {UPGRADE_PLANS.map((plan) => {
                const isSelected = search.plan === plan.id;
                return (
                  <Card
                    key={plan.id}
                    className={`relative flex h-full flex-col shadow-sm ${plan.cardClass} ${
                      isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                    }`}
                  >
                    <CardHeader className="min-h-32">
                      {plan.badge ? (
                        <Badge className="absolute end-4 top-4">{plan.badge}</Badge>
                      ) : null}
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${plan.accentClass}`}
                        >
                          <CreditCard className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <CardTitle className="text-lg">{plan.title}</CardTitle>
                      </div>
                      <CardDescription className="leading-6">{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col">
                      <ul className="flex-1 space-y-2.5" aria-label={`امکانات ${plan.title}`}>
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm leading-6">
                            <CheckCircle2
                              className={`mt-1 h-4 w-4 shrink-0 ${plan.checkClass}`}
                              aria-hidden="true"
                            />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-6 min-h-10 text-center">
                        {plan.price ? (
                          <p className="flex items-baseline justify-center gap-1.5">
                            <span className="text-xl font-black">{plan.price}</span>
                            <span className="text-sm font-semibold text-muted-foreground">
                              تومان
                            </span>
                          </p>
                        ) : (
                          <p className="text-sm font-semibold">قیمت‌گذاری متناسب با نیاز مجموعه</p>
                        )}
                      </div>

                      {plan.price ? (
                        <Button
                          type="button"
                          className="mt-3 w-full"
                          variant={plan.id === "advanced" ? "default" : "outline"}
                          aria-pressed={isSelected}
                          onClick={() => selectPlan(plan.id)}
                        >
                          درخواست ارتقا
                        </Button>
                      ) : (
                        <Button asChild type="button" className="mt-3 w-full" variant="outline">
                          <Link to="/dashboard/contact">درخواست مشاوره</Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <PaymentDialog
            plan={selectedPlan}
            onOpenChange={(open) => !open && closePaymentDialog()}
          />
        </div>
      </main>
    </div>
  );
}

function CurrentSubscriptionCard({
  subscription,
  isLoading,
  error,
  onRetry,
}: {
  subscription?: SchoolSubscriptionDto;
  isLoading: boolean;
  error?: unknown;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <Card aria-label="در حال دریافت وضعیت اشتراک">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isSubscriptionExpiredError(error)) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/[0.035]">
        <CardHeader>
          <CardTitle id="current-plan-title" className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-600" aria-hidden="true" />
            اتمام پلن
          </CardTitle>
          <CardDescription>اعتبار طرح شما به پایان رسیده است.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error || !subscription) {
    return (
      <Card className="border-destructive/25">
        <CardHeader>
          <CardTitle id="current-plan-title" className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
            طرح فعلی
          </CardTitle>
          <CardDescription>وضعیت اشتراک در دسترس نیست</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    );
  }

  const planName = getSubscriptionPlanName(subscription);
  const limits = subscription.limits;

  return (
    <Card className="overflow-hidden border-primary/20 bg-primary/[0.025]">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle id="current-plan-title" className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
              {planName}
            </CardTitle>
            <CardDescription className="mt-2 leading-6">
              {getSubscriptionValidityLabel(subscription)}؛ معتبر تا{" "}
              {formatSubscriptionDate(subscription.expires_at)}
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-primary/30 text-primary">
            {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SubscriptionMetric
            icon={Users}
            label="معلمان فعال"
            value={formatSubscriptionUsage(
              subscription.active_teacher_count,
              limits.max_active_teachers,
            )}
          />
          <SubscriptionMetric
            icon={Users}
            label="کلاس‌های فعال"
            value={formatSubscriptionUsage(
              subscription.active_class_count,
              limits.max_active_classes,
            )}
          />
          <SubscriptionMetric
            icon={Gauge}
            label="تولید برنامه در دوره"
            value={formatSubscriptionUsage(
              subscription.total_generations_used,
              limits.max_total_generations_per_user,
            )}
          />
          <SubscriptionMetric
            icon={Gauge}
            label="تولید برنامه امروز"
            value={formatSubscriptionUsage(
              subscription.daily_generations_used,
              limits.max_daily_generations_per_user,
            )}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/70 pt-4 text-xs text-muted-foreground sm:text-sm">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            شروع: {formatSubscriptionDate(subscription.starts_at)}
          </span>
          <span>خروجی اکسل: {subscription.excel_watermark ? "با نشان چیدمان" : "بدون نشان"}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SubscriptionMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/75 p-3.5">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
