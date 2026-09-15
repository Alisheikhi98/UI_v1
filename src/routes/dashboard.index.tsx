import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  School,
  Sparkles,
  Users,
} from "lucide-react";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { withAppName } from "@/lib/branding";
import { deriveDashboardReadiness, getPublishedSchedule } from "@/lib/dashboard-overview";
import { useDashboardOverview } from "@/lib/dashboard-queries";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: withAppName("داشبورد") },
      { name: "description", content: "نمای کلی وضعیت مدرسه و برنامه هفتگی" },
    ],
  }),
  component: DashboardPage,
});

const quickActions = [
  { label: "افزودن معلم", icon: Users, href: "/dashboard/teachers" },
  { label: "افزودن کلاس", icon: GraduationCap, href: "/dashboard/classes" },
  { label: "مدیریت کلاس‌ها", icon: BookOpenCheck, href: "/dashboard/classes" },
  { label: "تولید برنامه", icon: Sparkles, href: "/dashboard/generator" },
  { label: "مشاهده برنامه هفتگی", icon: CalendarDays, href: "/dashboard/timetable" },
] as const;

function DashboardPage() {
  const overview = useDashboardOverview();
  const schoolsLoading = overview.schools.query.isPending;
  const activeSchoolResolving =
    overview.schools.schools.length > 0 && !overview.school && !overview.schools.query.isError;

  return (
    <div className="flex flex-col" dir="rtl">
      <Header title="داشبورد" description="نمای کلی وضعیت مدرسه و برنامه هفتگی" />
      <main className="space-y-5 p-4 sm:space-y-6 sm:p-6">
        {schoolsLoading || activeSchoolResolving ? (
          <DashboardLoading />
        ) : overview.schools.query.isError ? (
          <GlobalDashboardError onRetry={() => void overview.schools.query.refetch()} />
        ) : !overview.school ? (
          <NoSchoolState />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">مدرسه فعال</p>
                <p className="font-semibold">{overview.school.name}</p>
              </div>
              <Badge variant="secondary" className="gap-1.5">
                <School className="h-3.5 w-3.5" />
                نمای مدیریتی
              </Badge>
            </div>

            <MetricsSection
              statistics={overview.statistics.data}
              loading={overview.statistics.isPending}
              error={overview.statistics.isError}
              onRetry={() => void overview.statistics.refetch()}
            />

            <div className="grid items-stretch gap-4 lg:grid-cols-2">
              <ReadinessSection
                statistics={overview.statistics.data}
                loading={overview.statistics.isPending}
                error={overview.statistics.isError}
                onRetry={() => void overview.statistics.refetch()}
              />
              <TimetableStatusSection
                candidates={overview.candidates.data}
                loading={overview.candidates.isPending}
                error={overview.candidates.isError}
                onRetry={() => void overview.candidates.refetch()}
              />
            </div>

            <QuickActions />
          </>
        )}
      </main>
    </div>
  );
}

type DashboardStatistics = ReturnType<typeof useDashboardOverview>["statistics"]["data"];
type DashboardCandidates = ReturnType<typeof useDashboardOverview>["candidates"]["data"];

function MetricsSection({
  statistics,
  loading,
  error,
  onRetry,
}: {
  statistics: DashboardStatistics;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <SectionError
        title="آمار مدرسه دریافت نشد."
        message="سایر بخش‌های داشبورد همچنان در دسترس هستند."
        onRetry={onRetry}
      />
    );
  }

  const metrics = [
    {
      label: "تعداد کلاس‌ها",
      value: statistics?.activeClassCount,
      icon: GraduationCap,
      href: "/dashboard/classes",
    },
    {
      label: "تعداد معلمان",
      value: statistics?.activeTeacherCount,
      icon: Users,
      href: "/dashboard/teachers",
    },
    {
      label: "زنگ هفتگی ثبت‌شده",
      value: statistics?.assignedWeeklySlotCount,
      icon: BookOpenCheck,
      href: "/dashboard/classes",
    },
    {
      label: "تعداد روزهای کاری",
      value: statistics?.activeDayCount,
      icon: CalendarCheck2,
      href: "/dashboard/schools",
    },
  ] as const;

  return (
    <section aria-label="خلاصه وضعیت مدرسه" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Link key={metric.label} to={metric.href} className="rounded-xl focus-visible:outline-none">
          <Card className="h-full transition-colors hover:border-primary/30">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                {loading || metric.value === undefined ? (
                  <Skeleton className="mt-2 h-7 w-14" data-testid="dashboard-metric-skeleton" />
                ) : (
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {metric.value.toLocaleString("fa-IR")}
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <metric.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </section>
  );
}

function ReadinessSection({
  statistics,
  loading,
  error,
  onRetry,
}: {
  statistics: DashboardStatistics;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (loading) return <SectionSkeleton title="آمادگی برای تولید برنامه" />;
  if (error || !statistics) {
    return (
      <SectionError
        title="وضعیت آمادگی دریافت نشد."
        message="برای بررسی مجدد، ارتباط با سرور را تازه کنید."
        onRetry={onRetry}
      />
    );
  }

  const readiness = deriveDashboardReadiness(statistics);
  const firstBlocker = readiness.blockers[0];

  return (
    <Card
      className={`flex h-full flex-col ${
        readiness.ready ? "border-emerald-500/25" : "border-amber-500/30"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`rounded-lg p-2 ${readiness.ready ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}
            >
              {readiness.ready ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">آمادگی برای تولید برنامه</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {readiness.ready
                  ? "اطلاعات پایه برای بررسی و تولید برنامه آماده است."
                  : "برای تولید برنامه هنوز چند مورد نیاز به تکمیل دارد."}
              </p>
            </div>
          </div>
          <Badge variant={readiness.ready ? "default" : "secondary"} className="shrink-0">
            {readiness.ready ? "آماده بررسی" : "نیاز به تکمیل"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {readiness.ready ? (
          <p className="text-xs text-muted-foreground">
            بررسی نهایی زمان حضور معلمان در صفحه تولید برنامه انجام می‌شود.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {readiness.blockers.map((blocker) => (
              <li key={blocker.id} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {blocker.label}
              </li>
            ))}
          </ul>
        )}
        <Button
          asChild
          className="mt-auto w-full self-start sm:w-auto"
          variant={readiness.ready ? "default" : "outline"}
        >
          <Link to={readiness.ready ? "/dashboard/generator" : firstBlocker!.href}>
            {readiness.ready ? "تولید برنامه" : "تکمیل اطلاعات"}
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function TimetableStatusSection({
  candidates,
  loading,
  error,
  onRetry,
}: {
  candidates: DashboardCandidates;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (loading) return <SectionSkeleton title="برنامه هفتگی" />;
  if (error || !candidates) {
    return (
      <SectionError
        title="وضعیت برنامه هفتگی دریافت نشد."
        message="این خطا روی آمار و دسترسی‌های دیگر اثر نمی‌گذارد."
        onRetry={onRetry}
      />
    );
  }

  const published = getPublishedSchedule(candidates);

  return (
    <Card className={`flex h-full flex-col ${published ? "border-primary/25" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">برنامه هفتگی</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {published
                  ? "برنامه نهایی مدرسه ثبت شده است."
                  : "هنوز برنامه هفتگی نهایی ثبت نشده است."}
              </p>
            </div>
          </div>
          <Badge variant={published ? "default" : "secondary"} className="shrink-0">
            {published ? "ثبت‌شده" : "ثبت‌نشده"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end">
        <Button
          asChild
          className="mt-auto w-full self-start sm:w-auto"
          variant={published ? "outline" : "default"}
        >
          <Link to={published ? "/dashboard/timetable" : "/dashboard/generator"}>
            {published ? "مشاهده برنامه هفتگی" : "تولید برنامه"}
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  return (
    <section aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title" className="mb-3 text-base font-semibold">
        دسترسی سریع
      </h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {quickActions.map((action) => (
          <Button key={action.label} asChild variant="outline" className="h-11 justify-start">
            <Link to={action.href}>
              <action.icon className="h-4 w-4 text-primary" />
              {action.label}
            </Link>
          </Button>
        ))}
      </div>
    </section>
  );
}

function NoSchoolState() {
  return (
    <Card className="mx-auto max-w-xl border-dashed">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
          <School className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold">برای شروع، ابتدا مدرسه خود را ایجاد کنید.</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          پس از ایجاد مدرسه می‌توانید روزهای کاری، معلمان، کلاس‌ها و برنامه هفتگی را مدیریت کنید.
        </p>
        <Button asChild className="mt-5">
          <Link to="/dashboard/schools">ایجاد مدرسه</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-5" aria-label="در حال دریافت اطلاعات داشبورد">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
    </div>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <Card className="flex h-full flex-col" aria-label={`${title} در حال دریافت`}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-9 w-32" />
      </CardContent>
    </Card>
  );
}

function SectionError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="flex h-full flex-col border-destructive/25">
      <CardContent className="flex flex-1 flex-col items-start gap-3 p-5">
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <Button className="mt-auto" variant="outline" size="sm" onClick={onRetry}>
          تلاش مجدد
        </Button>
      </CardContent>
    </Card>
  );
}

function GlobalDashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="mx-auto max-w-xl border-destructive/30">
      <CardContent className="flex flex-col items-center px-6 py-10 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <h2 className="mt-4 font-semibold">اطلاعات مدرسه دریافت نشد.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          ارتباط با سرور را بررسی کنید و دوباره تلاش کنید.
        </p>
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          تلاش مجدد
        </Button>
      </CardContent>
    </Card>
  );
}
