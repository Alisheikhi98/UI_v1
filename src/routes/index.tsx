import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Sparkles,
  Tag,
  UsersRound,
} from "lucide-react";
import { ContactChannels } from "@/components/contact-channels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME, withAppName } from "@/lib/branding";
import { CONTACT_INFO } from "@/lib/contact-info";

const productFeatures = [
  {
    icon: UsersRound,
    title: "اطلاعات مدرسه در یک مسیر",
    description: "کلاس‌ها، معلمان، درس‌ها و زمان‌های حضور را منظم و یکپارچه تعریف کنید.",
  },
  {
    icon: Sparkles,
    title: "تولید برنامه با قیود واقعی",
    description: "چیدمان با توجه به ظرفیت کلاس‌ها، حضور معلمان و زنگ‌های مدرسه برنامه می‌سازد.",
  },
  {
    icon: CalendarDays,
    title: "بررسی و انتشار ساده",
    description:
      "برنامه پیشنهادی را بررسی کنید و خروجی هفتگی کلاس‌ها و معلمان را در اختیار داشته باشید.",
  },
] as const;

const workflowSteps = [
  { number: "۱", title: "تعریف اطلاعات", description: "مدرسه، کلاس‌ها و معلمان را ثبت کنید." },
  {
    number: "۲",
    title: "تنظیم محدودیت‌ها",
    description: "دروس، زمان‌ها و دسترسی معلمان را مشخص کنید.",
  },
  {
    number: "۳",
    title: "تولید و بررسی",
    description: "برنامه را تولید، کنترل و برای استفاده آماده کنید.",
  },
] as const;

const pricingPlans = [
  {
    id: "trial",
    title: "پلن آزمایشی پایه",
    description: "برای شروع و آشنایی با امکانات سامانه",
    features: [
      "۵ روز اعتبار",
      "تا ۶۰ دبیر فعال",
      "تا ۲۰ کلاس فعال",
      "حداکثر ۲۰ بار ساخت برنامه در کل دوره",
      "حداکثر ۴ بار ساخت برنامه در روز برای هر کاربر",
      "خروجی اکسل با واترمارک",
    ],
    note: "ظرفیت دبیر و کلاس این پلن برای ارزیابی کامل سامانه بازتر است، اما دوره فقط ۵ روز و حداکثر ۲۰ بار ساخت برنامه فعال است.",
    cta: "شروع دوره آزمایشی",
    destination: "register",
    cardClass:
      "border-sky-200/80 bg-sky-50/35 hover:border-sky-300 dark:border-sky-900/70 dark:bg-sky-950/15 dark:hover:border-sky-800",
    accentClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    checkClass: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "professional",
    title: "پلن حرفه‌ای",
    description: "مناسب مدارس کوچک و استفاده روزمره",
    price: "۱٬۵۰۰٬۰۰۰",
    features: [
      "اعتبار یک‌ساله",
      "تا ۳۰ دبیر فعال",
      "تا ۱۰ کلاس فعال",
      "بدون محدودیت در تعداد کل ساخت برنامه",
      "حداکثر ۲۰ بار ساخت برنامه در روز برای هر کاربر",
      "خروجی اکسل بدون واترمارک",
    ],
    cta: "انتخاب پلن حرفه‌ای",
    destination: "contact",
    cardClass:
      "border-emerald-200/80 bg-emerald-50/30 hover:border-emerald-300 dark:border-emerald-900/70 dark:bg-emerald-950/15 dark:hover:border-emerald-800",
    accentClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    checkClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "advanced",
    title: "پلن پیشرفته",
    description: "مناسب مدارس متوسط و مجموعه‌های آموزشی بزرگ‌تر",
    badge: "پیشنهاد ویژه",
    price: "۲٬۵۰۰٬۰۰۰",
    features: [
      "اعتبار یک‌ساله",
      "تا ۶۰ دبیر فعال",
      "تا ۲۵ کلاس فعال",
      "بدون محدودیت در تعداد کل ساخت برنامه",
      "حداکثر ۵۰ بار ساخت برنامه در روز برای هر کاربر",
      "خروجی اکسل بدون واترمارک",
    ],
    cta: "انتخاب پلن پیشرفته",
    destination: "contact",
    cardClass:
      "border-indigo-400/80 bg-indigo-50/45 shadow-lg shadow-indigo-500/10 hover:border-indigo-500 dark:border-indigo-700/80 dark:bg-indigo-950/20 dark:hover:border-indigo-600",
    accentClass: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
    checkClass: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "enterprise",
    title: "پلن سازمانی",
    description: "راهکاری منعطف برای مدارس و مجموعه‌های بزرگ",
    features: [
      "اعتبار یک‌ساله",
      "ظرفیت دبیران متناسب با نیاز مجموعه",
      "ظرفیت کلاس‌ها متناسب با نیاز مجموعه",
      "بدون محدودیت در تعداد کل ساخت برنامه",
      "سقف روزانه ساخت برنامه به‌صورت اختصاصی",
      "خروجی اکسل بدون واترمارک",
      "تنظیم محدودیت‌ها براساس نیاز مدرسه",
    ],
    cta: "تماس برای مشاوره",
    destination: "contact",
    cardClass:
      "border-amber-200/90 bg-amber-50/35 hover:border-amber-300 dark:border-amber-900/70 dark:bg-amber-950/15 dark:hover:border-amber-800",
    accentClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    checkClass: "text-amber-600 dark:text-amber-400",
  },
] as const;

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: withAppName("برنامه‌ریزی هوشمند مدارس") }] }),
  component: HomePage,
});

function HomePage() {
  return (
    <div dir="rtl" className="min-h-screen overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 w-full items-center justify-between gap-3 px-4 sm:h-18 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="صفحه اصلی چیدمان">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary shadow-sm shadow-primary/20">
              <CalendarDays className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </span>
            <span className="truncate text-lg font-bold tracking-tight">{APP_NAME}</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-1.5" aria-label="ناوبری اصلی">
            <Button asChild variant="ghost" size="sm" className="gap-1.5 px-2.5 sm:px-3">
              <a href="#pricing">
                <Tag className="h-4 w-4" aria-hidden="true" />
                تعرفه‌ها
              </a>
            </Button>
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
        <section className="relative isolate overflow-hidden border-b border-border/50">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_15%,hsl(var(--primary)/0.13),transparent_34%),radial-gradient(circle_at_10%_80%,hsl(var(--secondary)/0.16),transparent_32%)]" />
          <div className="container mx-auto grid w-full items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
            <div className="max-w-2xl text-center lg:text-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary sm:text-sm">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                برنامه‌ریزی هفتگی، متناسب با واقعیت مدرسه
              </div>
              <h1 className="mt-6 text-4xl font-black leading-[1.25] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                ساخت برنامه مدرسه، <span className="text-primary">شفاف و قابل مدیریت</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg lg:mx-0">
                {APP_NAME} اطلاعات کلاس‌ها، معلمان و درس‌ها را کنار هم قرار می‌دهد تا برنامه‌ای
                هماهنگ، قابل بررسی و آماده استفاده بسازید.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/20">
                  <Link to="/auth/register">
                    ساخت حساب کاربری
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/auth/login">ورود به چیدمان</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                برای شروع، اطلاعات مدرسه را ثبت کنید؛ باقی مسیر مرحله‌به‌مرحله پیش می‌رود.
              </p>
            </div>

            <HeroProductPreview />
          </div>
        </section>

        <section className="py-14 sm:py-20" aria-labelledby="features-title">
          <div className="container mx-auto w-full px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-primary">یک مسیر روشن برای مدیر مدرسه</p>
              <h2
                id="features-title"
                className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
              >
                از داده‌های مدرسه تا برنامه هفتگی
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                ابزارهای ضروری در یک تجربه منظم؛ بدون فرم‌های پراکنده و پیچیدگی غیرضروری.
              </p>
            </div>
            <div className="mx-auto mt-9 grid w-full max-w-5xl gap-4 md:grid-cols-3">
              {productFeatures.map((feature) => (
                <Card key={feature.title} className="border-border/60 bg-card/70 shadow-sm">
                  <CardContent className="p-5 sm:p-6">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <feature.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-bold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
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
          aria-labelledby="workflow-title"
        >
          <div className="container mx-auto w-full px-4 sm:px-6">
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
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {step.number}
                    </span>
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
          id="pricing"
          className="scroll-mt-20 py-14 sm:py-20"
          aria-labelledby="pricing-title"
        >
          <div className="container mx-auto w-full px-4 sm:px-6">
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
              {pricingPlans.map((plan) => {
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
                        {plan.destination === "register" ? (
                          <Button
                            asChild
                            className="w-full"
                            variant={highlighted ? "default" : "outline"}
                          >
                            <Link to="/auth/register">{plan.cta}</Link>
                          </Button>
                        ) : (
                          <Button
                            asChild
                            className="w-full"
                            variant={highlighted ? "default" : "outline"}
                          >
                            <a href="#contact">{plan.cta}</a>
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
          className="scroll-mt-20 border-t border-border/60 py-14 sm:py-20"
          aria-labelledby="contact-title"
        >
          <div className="container mx-auto w-full px-4 sm:px-6">
            <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
                <p className="text-sm font-medium text-primary-foreground/75">آماده شروع هستید؟</p>
                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                  اولین برنامه را با اطلاعات واقعی مدرسه بسازید.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-primary-foreground/80 sm:text-base">
                  حساب کاربری خود را ایجاد کنید و مراحل راه‌اندازی مدرسه را در یک مسیر مشخص پیش
                  ببرید.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" variant="secondary">
                    <Link to="/auth/register">ثبت‌نام در چیدمان</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="border border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  >
                    <Link to="/auth/login">ورود</Link>
                  </Button>
                </div>
              </div>

              <Card className="rounded-3xl border-border/70 shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <UsersRound className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 id="contact-title" className="text-xl font-bold">
                        {CONTACT_INFO.title}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        برای پرسش یا هماهنگی، از طریق بله با ما در ارتباط باشید.
                      </p>
                    </div>
                  </div>
                  <ContactChannels className="mt-5" />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-7">
        <div className="container mx-auto flex w-full flex-col items-center justify-between gap-3 px-4 text-center sm:flex-row sm:px-6 sm:text-start">
          <div className="flex items-center gap-2 font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            {APP_NAME}
          </div>
          <p className="text-xs text-muted-foreground">سامانه مدیریت و تولید برنامه هفتگی مدارس</p>
        </div>
      </footer>
    </div>
  );
}

function HeroProductPreview() {
  const readinessItems = [
    { icon: GraduationCap, label: "کلاس‌ها و درس‌ها", value: "۱۲ کلاس" },
    { icon: UsersRound, label: "معلمان و زمان حضور", value: "۲۴ معلم" },
    { icon: Clock3, label: "روزها و زنگ‌های مدرسه", value: "۳۰ زنگ" },
  ] as const;

  return (
    <div className="relative mx-auto w-full max-w-xl" aria-label="نمایی از روند آماده‌سازی برنامه">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-primary/10 blur-2xl" />
      <Card className="overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-2xl shadow-primary/10">
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">آمادگی تولید برنامه</p>
              <p className="text-[11px] text-muted-foreground">دبیرستان نمونه</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            آماده
          </span>
        </div>
        <CardContent className="space-y-3 p-4 sm:p-5">
          {readinessItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
            >
              <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{item.value}</span>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            </div>
          ))}
          <div className="rounded-2xl bg-muted/45 p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold">نمونه برنامه هفتگی</p>
              <BookOpenCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              {["ریاضی", "فیزیک", "ادبیات", "شیمی", "زبان", "ورزش"].map((course, index) => (
                <span
                  key={course}
                  className={
                    index % 2 === 0
                      ? "rounded-lg bg-primary/10 px-2 py-2 text-primary"
                      : "rounded-lg bg-background px-2 py-2 text-muted-foreground"
                  }
                >
                  {course}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
