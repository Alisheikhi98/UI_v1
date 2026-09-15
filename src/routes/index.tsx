import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Layers3,
  School,
  Sparkles,
  Tag,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import weeklyTimetablePreviewImage from "@/assets/landing/weekly-timetable-preview.png";
import { ContactChannels } from "@/components/contact-channels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthSession } from "@/lib/auth-session";
import { APP_NAME, withAppName } from "@/lib/branding";
import { CONTACT_INFO } from "@/lib/contact-info";
import { PLAN_CATALOG, type PlanId } from "@/lib/plans";

const quickValues = [
  {
    icon: AlertTriangle,
    label: "کاهش تداخل برنامه‌ها",
  },
  {
    icon: UserRoundCheck,
    label: "محدودیت حضور دبیران",
  },
  {
    icon: FileSpreadsheet,
    label: "خروجی برنامه هفتگی",
  },
  {
    icon: School,
    label: "مناسب متوسطه اول و دوم",
  },
] as const;

const schedulingProblems = [
  {
    icon: UsersRound,
    title: "تداخل ساعت دبیران",
    description: "یک دبیر نمی‌تواند هم‌زمان در دو کلاس باشد.",
  },
  {
    icon: Clock3,
    title: "محدودیت روزهای حضور",
    description: "زمان حضور هر دبیر با دیگری متفاوت است.",
  },
  {
    icon: Layers3,
    title: "تعداد زیاد کلاس‌ها و درس‌ها",
    description: "هماهنگی دستی با افزایش داده‌ها دشوارتر می‌شود.",
  },
  {
    icon: CalendarDays,
    title: "تغییرات مداوم برنامه",
    description: "هر تغییر کوچک می‌تواند چند بخش دیگر را جابه‌جا کند.",
  },
] as const;

const workflowSteps = [
  {
    number: "۱",
    icon: School,
    title: "اطلاعات مدرسه را وارد کنید",
    description: "روزهای کاری، تعداد زنگ‌ها و مشخصات مدرسه را ثبت کنید.",
  },
  {
    number: "۲",
    icon: UsersRound,
    title: "کلاس‌ها، دبیران و درس‌ها را تنظیم کنید",
    description: "تخصیص درس‌ها و محدودیت حضور دبیران را مشخص کنید.",
  },
  {
    number: "۳",
    icon: Sparkles,
    title: "برنامه را تولید و بررسی کنید",
    description: "نتیجه را در نمای مدرسه، کلاس یا دبیر کنترل و منتشر کنید.",
  },
] as const;

const productFeatures = [
  {
    icon: GraduationCap,
    title: "مدیریت کلاس‌ها",
    description: "کلاس‌ها را بر اساس پایه و رشته سامان‌دهی کنید.",
  },
  {
    icon: UsersRound,
    title: "مدیریت دبیران",
    description: "اطلاعات دبیران و درس‌های قابل تدریس را یکجا ببینید.",
  },
  {
    icon: Clock3,
    title: "محدودیت روزهای حضور",
    description: "زنگ‌های در دسترس هر دبیر را دقیق ثبت کنید.",
  },
  {
    icon: BookOpenCheck,
    title: "درس‌های هر کلاس",
    description: "درس، دبیر و تعداد زنگ هفتگی را برای هر کلاس تعیین کنید.",
  },
  {
    icon: Sparkles,
    title: "تولید با محدودیت‌ها",
    description: "برنامه با توجه به داده‌ها و قیود واقعی مدرسه تولید می‌شود.",
  },
  {
    icon: Eye,
    title: "نمای مدرسه، کلاس و دبیر",
    description: "برنامه نهایی را از سه زاویه کاربردی بررسی کنید.",
  },
  {
    icon: Download,
    title: "خروجی اکسل",
    description: "نسخه قابل استفاده برنامه را برای مدرسه دریافت کنید.",
  },
  {
    icon: CheckCircle2,
    title: "بررسی آمادگی",
    description: "پیش از تولید، موارد ضروری و ناقص را شفاف ببینید.",
  },
] as const;

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: withAppName("برنامه‌ریزی هوشمند مدارس") }] }),
  component: HomePage,
});

function HomePage() {
  const authSession = useAuthSession();
  const navigate = useNavigate();
  const [authenticationPlanId, setAuthenticationPlanId] = useState<PlanId | null>(null);
  const subscriptionDestination = authenticationPlanId
    ? `/dashboard/subscription?plan=${authenticationPlanId}`
    : "/dashboard/subscription";

  useEffect(() => {
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";

    return () => {
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    };
  }, []);

  function handlePaidPlanSelection(planId: PlanId) {
    if (authSession.status === "authenticated") {
      void navigate({ to: "/dashboard/subscription", search: { plan: planId } });
      return;
    }

    if (authSession.status === "unauthenticated") setAuthenticationPlanId(planId);
  }

  return (
    <div dir="rtl" className="min-h-screen overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:h-18 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="صفحه اصلی چیدمان">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary shadow-sm shadow-primary/20">
              <CalendarDays className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </span>
            <span className="truncate text-lg font-bold tracking-tight">{APP_NAME}</span>
          </Link>
          <nav
            className="hidden items-center gap-1 text-sm text-muted-foreground md:flex"
            aria-label="بخش‌های صفحه"
          >
            <Button asChild variant="ghost" size="sm">
              <a href="#features">امکانات</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="#workflow">نحوه کار</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="#pricing">تعرفه‌ها</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="#contact">ارتباط با ما</a>
            </Button>
          </nav>
          <nav className="flex shrink-0 items-center gap-1.5" aria-label="ورود و ثبت‌نام">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth/login">ورود</Link>
            </Button>
            <Button asChild size="sm" className="px-3.5 sm:px-5">
              <Link to="/auth/register">ثبت‌نام</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-b border-border/50 bg-muted/10">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_10%,hsl(var(--primary)/0.12),transparent_34%),radial-gradient(circle_at_8%_88%,hsl(var(--secondary)/0.12),transparent_28%)]" />
          <div className="container mx-auto flex w-full max-w-7xl justify-center px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
            <div className="w-full max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary sm:text-sm">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                برنامه‌ریزی هوشمند، متناسب با واقعیت مدرسه
              </div>
              <h1 className="mt-6 text-4xl font-black leading-[1.3] tracking-tight text-balance sm:text-5xl lg:text-[3.5rem]">
                برنامه هفتگی مدرسه را <span className="text-primary">هوشمندانه بچینید</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                {APP_NAME} با درنظرگرفتن محدودیت دبیران، کلاس‌ها، درس‌ها و روزهای کاری، ساخت برنامه
                هفتگی مدرسه را سریع‌تر و دقیق‌تر می‌کند.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/20">
                  <Link to="/auth/register">
                    شروع رایگان
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#pricing">مشاهده تعرفه‌ها</a>
                </Button>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                دوره آزمایشی برای آشنایی با جریان کامل ساخت برنامه در دسترس است.
              </p>
            </div>
          </div>
        </section>

        <section
          className="border-b border-border/60 bg-background"
          aria-label="ارزش‌های کلیدی چیدمان"
        >
          <div className="container mx-auto grid w-full max-w-7xl grid-cols-2 gap-px px-4 py-4 sm:px-6 lg:grid-cols-4">
            {quickValues.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-center gap-2 px-2 py-3 text-center text-xs font-medium sm:text-sm"
              >
                <item.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="py-14 sm:py-20" aria-labelledby="problem-title">
          <div className="container mx-auto w-full max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-primary">مسئله‌ای آشنا برای مدیران مدارس</p>
              <h2 id="problem-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                چرا ساخت برنامه هفتگی سخت می‌شود؟
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                هر تصمیم به چند کلاس، دبیر و زنگ دیگر وابسته است و بررسی دستی به‌سرعت پیچیده می‌شود.
              </p>
            </div>
            <div className="mx-auto mt-9 grid w-full max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {schedulingProblems.map((problem) => (
                <Card key={problem.title} className="h-full border-border/60 bg-card/70 shadow-sm">
                  <CardContent className="p-5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      <problem.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-bold">{problem.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {problem.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mx-auto mt-6 flex w-full max-w-3xl items-center justify-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 text-center text-sm font-semibold text-primary sm:text-base">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              چیدمان این محدودیت‌ها را هم‌زمان بررسی می‌کند.
            </div>
          </div>
        </section>

        <section
          id="workflow"
          className="scroll-mt-20 border-y border-border/60 bg-muted/30 py-14 sm:py-20"
          aria-labelledby="workflow-title"
        >
          <div className="container mx-auto w-full max-w-7xl px-4 sm:px-6">
            <div className="mx-auto w-full max-w-5xl">
              <div className="text-center">
                <h2 id="workflow-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
                  چیدمان چگونه کار می‌کند؟
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  سه مرحله مشخص برای رسیدن به یک برنامه قابل استفاده
                </p>
              </div>
              <ol className="mt-9 grid gap-4 md:grid-cols-3">
                {workflowSteps.map((step) => (
                  <li
                    key={step.number}
                    className="relative rounded-2xl border bg-background p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {step.number}
                      </span>
                      <step.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 font-bold">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-20 py-14 sm:py-20"
          aria-labelledby="features-title"
        >
          <div className="container mx-auto w-full max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-primary">ابزارهای واقعی برای یک کار واقعی</p>
              <h2
                id="features-title"
                className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
              >
                از داده‌های مدرسه تا برنامه هفتگی
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                تمام مراحل ضروری برنامه‌ریزی مدرسه در یک مسیر روشن و قابل کنترل قرار دارد.
              </p>
            </div>
            <div className="mx-auto mt-9 grid w-full max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {productFeatures.map((feature) => (
                <Card key={feature.title} className="h-full border-border/60 bg-card/70 shadow-sm">
                  <CardContent className="p-5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <feature.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-bold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section
          className="border-y border-border/60 bg-muted/30 py-14 sm:py-20"
          aria-labelledby="preview-title"
        >
          <div className="container mx-auto grid w-full max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
            <div className="text-center lg:text-start">
              <p className="text-sm font-semibold text-primary">پیش‌نمایش پیش از انتشار</p>
              <h2 id="preview-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                قبل از نهایی‌کردن، برنامه را دقیق بررسی کنید
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                برنامه را بر اساس مدرسه، کلاس یا دبیر ببینید و نتیجه را پیش از استفاده نهایی کنترل
                کنید.
              </p>
              <ul className="mt-6 space-y-3 text-start text-sm">
                {[
                  "نمای یکپارچه برنامه مدرسه",
                  "بررسی اختصاصی هر کلاس و دبیر",
                  "دریافت خروجی برای استفاده روزمره",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <TimetableProductPreview />
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-20 py-14 sm:py-20"
          aria-labelledby="pricing-title"
        >
          <div className="container mx-auto w-full max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 id="pricing-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
                پلن مناسب مدرسه خود را انتخاب کنید
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                با توجه به تعداد کلاس‌ها، دبیران و میزان استفاده از سیستم برنامه‌ریزی، بهترین گزینه
                را برای مجموعه آموزشی خود انتخاب کنید.
              </p>
            </div>

            <div className="mx-auto mt-9 grid w-full max-w-7xl items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
              {PLAN_CATALOG.map((plan) => {
                const highlighted = plan.id === "advanced";
                return (
                  <Card
                    key={plan.id}
                    className={`relative h-full shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none ${plan.cardClass}`}
                  >
                    <CardContent className="flex h-full flex-col p-5 sm:p-6">
                      <div className="relative min-h-28">
                        {"badge" in plan ? (
                          <span className="absolute end-0 top-0 inline-flex rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white dark:bg-indigo-500">
                            {plan.badge}
                          </span>
                        ) : null}
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${plan.accentClass}`}
                          >
                            <Tag className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <h3 className="text-lg font-bold leading-7">{plan.title}</h3>
                        </div>
                        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                          {plan.description}
                        </p>
                      </div>

                      <div className="my-5 border-t border-border/70" />

                      <ul className="flex-1 space-y-3" aria-label={`امکانات ${plan.title}`}>
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5 text-sm leading-6">
                            <CheckCircle2
                              className={`mt-1 h-4 w-4 shrink-0 ${plan.checkClass}`}
                              aria-hidden="true"
                            />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {"note" in plan ? (
                        <p className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-5 text-muted-foreground">
                          {plan.note}
                        </p>
                      ) : null}

                      <div className="mt-6 min-h-9 text-center">
                        {"price" in plan ? (
                          <p
                            className="flex items-baseline justify-center gap-1.5"
                            aria-label={`${plan.price} تومان`}
                          >
                            <span className="text-xl font-black tracking-tight">{plan.price}</span>
                            <span className="text-sm font-semibold text-muted-foreground">
                              تومان
                            </span>
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-3">
                        {plan.landingDestination === "register" ? (
                          <Button
                            asChild
                            className="w-full"
                            variant={highlighted ? "default" : "outline"}
                          >
                            <Link to="/auth/register">{plan.landingCta}</Link>
                          </Button>
                        ) : plan.price ? (
                          <Button
                            type="button"
                            className="w-full"
                            variant={highlighted ? "default" : "outline"}
                            disabled={authSession.status === "loading"}
                            onClick={() => handlePaidPlanSelection(plan.id)}
                          >
                            {plan.landingCta}
                          </Button>
                        ) : (
                          <Button
                            asChild
                            className="w-full"
                            variant={highlighted ? "default" : "outline"}
                          >
                            <a href="#contact">{plan.landingCta}</a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="contact"
          className="scroll-mt-20 border-t border-border/60 py-14 sm:py-16"
          aria-labelledby="contact-title"
        >
          <div className="container mx-auto w-full max-w-7xl px-4 sm:px-6">
            <div className="mx-auto grid w-full max-w-4xl items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="text-center lg:text-start">
                <p className="text-sm font-semibold text-primary">همراه شما در شروع مسیر</p>
                <h2 id="contact-title" className="mt-2 text-2xl font-bold sm:text-3xl">
                  {CONTACT_INFO.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  برای پرسش درباره امکانات، انتخاب پلن یا شروع استفاده از چیدمان، از طریق بله با ما
                  در ارتباط باشید.
                </p>
              </div>

              <Card className="rounded-3xl border-border/70 shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <UsersRound className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <p className="text-sm font-semibold">پاسخ‌گویی از طریق پیام‌رسان بله</p>
                  </div>
                  <ContactChannels className="mt-5" />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="pb-14 sm:pb-20" aria-labelledby="final-cta-title">
          <div className="container mx-auto w-full max-w-7xl px-4 sm:px-6">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 rounded-3xl bg-primary px-6 py-8 text-center text-primary-foreground shadow-xl shadow-primary/15 sm:px-8 lg:flex-row lg:text-start">
              <div>
                <h2 id="final-cta-title" className="text-2xl font-bold sm:text-3xl">
                  آماده‌اید برنامه هفتگی مدرسه را ساده‌تر بسازید؟
                </h2>
                <p className="mt-2 text-sm leading-7 text-primary-foreground/80 sm:text-base">
                  اطلاعات مدرسه را ثبت کنید و مسیر تولید برنامه را مرحله‌به‌مرحله پیش ببرید.
                </p>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
                <Button asChild size="lg" variant="secondary">
                  <Link to="/auth/register">شروع دوره آزمایشی</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="border border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <a href="#pricing">مشاهده تعرفه‌ها</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-muted/20 py-8">
        <div className="container mx-auto grid w-full max-w-7xl gap-7 px-4 sm:grid-cols-[1fr_auto] sm:px-6">
          <div className="max-w-md text-center sm:text-start">
            <div className="flex items-center justify-center gap-2 font-semibold sm:justify-start">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
              </span>
              {APP_NAME}
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              سامانه مدیریت محدودیت‌ها و تولید برنامه هفتگی برای مدارس متوسطه
            </p>
          </div>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm text-muted-foreground sm:justify-end"
            aria-label="پیوندهای پایین صفحه"
          >
            <a href="#features" className="hover:text-foreground">
              امکانات
            </a>
            <a href="#pricing" className="hover:text-foreground">
              تعرفه‌ها
            </a>
            <Link to="/auth/login" className="hover:text-foreground">
              ورود
            </Link>
            <Link to="/auth/register" className="hover:text-foreground">
              ثبت‌نام
            </Link>
            <a href="#contact" className="hover:text-foreground">
              ارتباط با ما
            </a>
          </nav>
        </div>
      </footer>

      <Dialog
        open={authenticationPlanId !== null}
        onOpenChange={(open) => !open && setAuthenticationPlanId(null)}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>برای ادامه وارد حساب شوید</DialogTitle>
            <DialogDescription>
              برای خرید یا ارتقای طرح، ابتدا وارد حساب کاربری خود شوید یا ثبت‌نام کنید.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                انصراف
              </Button>
            </DialogClose>
            <Button asChild variant="outline">
              <Link to="/auth/register">ثبت‌نام</Link>
            </Button>
            <Button asChild>
              <Link to="/auth/login" search={{ redirect: subscriptionDestination }}>
                ورود
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TimetableProductPreview() {
  return (
    <ProductScreenshot
      src={weeklyTimetablePreviewImage}
      alt="نمای واقعی برنامه هفتگی مدرسه در چیدمان"
      width={1592}
      height={988}
      label="نمای واقعی برنامه هفتگی مدرسه"
      className="max-w-4xl"
    />
  );
}

interface ProductScreenshotProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  label: string;
  className?: string;
  priority?: boolean;
}

function ProductScreenshot({
  src,
  alt,
  width,
  height,
  label,
  className = "",
  priority = false,
}: ProductScreenshotProps) {
  return (
    <figure className={`relative mx-auto w-full min-w-0 ${className}`}>
      <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-primary/15 blur-2xl sm:-inset-5" />
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-background p-1.5 shadow-2xl shadow-primary/15 sm:rounded-3xl sm:p-2">
        <div className="pointer-events-none absolute inset-x-1/4 -top-8 z-10 h-16 rounded-full bg-primary/15 blur-2xl" />
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="relative block h-auto w-full rounded-xl object-contain sm:rounded-2xl"
        />
      </div>
      <figcaption className="mx-auto mt-3 w-fit rounded-full border border-primary/15 bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
        {label}
      </figcaption>
    </figure>
  );
}
