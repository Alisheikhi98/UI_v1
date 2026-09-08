import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CreditCard, ExternalLink, Landmark, ShieldAlert } from "lucide-react";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { withAppName } from "@/lib/branding";
import { CONTACT_INFO } from "@/lib/contact-info";
import { UPGRADE_PLANS, type PlanId } from "@/lib/plans";

export const Route = createFileRoute("/dashboard/subscription")({
  head: () => ({ meta: [{ title: withAppName("طرح و اشتراک") }] }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(null);
  const selectedPlan = UPGRADE_PLANS.find((plan) => plan.id === selectedPlanId) ?? null;

  return (
    <div className="flex min-h-screen flex-col" dir="rtl">
      <Header
        title="طرح و اشتراک"
        description="وضعیت اشتراک و گزینه‌های ارتقای چیدمان را در یک مسیر بررسی کنید."
      />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <section aria-labelledby="current-plan-title">
            <Card className="overflow-hidden border-amber-500/25 bg-amber-500/5">
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle id="current-plan-title" className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
                      طرح فعلی
                    </CardTitle>
                    <CardDescription className="mt-2 max-w-2xl leading-6">
                      سرویس فعلی هنوز اطلاعات طرح، اعتبار و محدودیت‌های حساب را ارائه نمی‌کند.
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="w-fit border-amber-500/35 text-amber-700 dark:text-amber-300"
                  >
                    وضعیت در دسترس نیست
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-background/70 p-4 text-sm leading-6">
                  <ShieldAlert
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                    aria-hidden="true"
                  />
                  <p>
                    برای جلوگیری از نمایش اطلاعات نادرست، نام طرح، تاریخ انقضا، میزان مصرف و سقف‌ها
                    تا زمان پشتیبانی سرویس نمایش داده نمی‌شوند.
                  </p>
                </div>
              </CardContent>
            </Card>
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
                const isSelected = selectedPlanId === plan.id;
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

                      <Button
                        type="button"
                        className="mt-3 w-full"
                        variant={plan.id === "advanced" ? "default" : "outline"}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedPlanId(plan.id)}
                      >
                        {plan.id === "enterprise" ? "درخواست مشاوره" : "درخواست ارتقا"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {selectedPlan ? (
            <section aria-labelledby="payment-information-title">
              <Card className="border-primary/25">
                <CardHeader>
                  <CardTitle id="payment-information-title" className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-primary" aria-hidden="true" />
                    اطلاعات پرداخت
                  </CardTitle>
                  <CardDescription className="leading-6">
                    درخواست برای {selectedPlan.title}
                    {selectedPlan.price
                      ? ` به مبلغ ${selectedPlan.price} تومان`
                      : " با قیمت توافقی"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="grid gap-3 text-sm leading-6 sm:grid-cols-3">
                    <li className="rounded-xl border bg-muted/25 p-4">
                      <span className="font-semibold">۱. دریافت اطلاعات پرداخت</span>
                      <p className="mt-1 text-muted-foreground">
                        شماره کارت و اطلاعات مقصد را از پشتیبانی دریافت کنید.
                      </p>
                    </li>
                    <li className="rounded-xl border bg-muted/25 p-4">
                      <span className="font-semibold">۲. کارت‌به‌کارت</span>
                      <p className="mt-1 text-muted-foreground">
                        مبلغ اعلام‌شده را از طریق کارت‌به‌کارت پرداخت کنید.
                      </p>
                    </li>
                    <li className="rounded-xl border bg-muted/25 p-4">
                      <span className="font-semibold">۳. ارسال رسید</span>
                      <p className="mt-1 text-muted-foreground">
                        رسید یا کد پیگیری را برای بررسی و فعال‌سازی ارسال کنید.
                      </p>
                    </li>
                  </ol>

                  <div className="rounded-xl border border-dashed p-4 text-sm leading-6">
                    پس از کارت‌به‌کارت، رسید یا کد پیگیری پرداخت را ارسال کنید تا طرح شما تأیید و
                    فعال شود. ثبت درخواست و تأیید پرداخت در حال حاضر به‌صورت دستی از طریق پشتیبانی
                    انجام می‌شود.
                  </div>

                  <Button asChild className="w-full sm:w-auto">
                    <a
                      href={CONTACT_INFO.primaryBaleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`ارتباط با پشتیبانی در بله از طریق ${CONTACT_INFO.primaryBaleId} (باز شدن در زبانه جدید)`}
                    >
                      ارتباط با پشتیبانی در بله
                      <ExternalLink className="ms-2 h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
