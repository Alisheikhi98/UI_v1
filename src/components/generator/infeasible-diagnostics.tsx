import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  RefreshCcw,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { presentScheduleDiagnostics } from "@/lib/schedule-diagnostics";
import type { ScheduleDiagnostic } from "@/lib/scheduler";
import type { Class, ClassAssignment, DaySlotGroup, Teacher } from "@/lib/types";

function unique(values: readonly string[]) {
  return [...new Set(values)];
}

function ConflictDetail({ label, values }: { label: string; values: readonly string[] }) {
  const visibleValues = unique(values);
  if (visibleValues.length === 0) return null;
  return (
    <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-2 text-sm leading-6">
      <dt className="font-medium text-muted-foreground">{label}:</dt>
      <dd className="min-w-0 font-medium text-foreground">{visibleValues.join(" و ")}</dd>
    </div>
  );
}

export function InfeasibleDiagnostics({
  diagnostics,
  teachers,
  classes,
  courses,
  daySlotGroups,
  assignments,
  onDismiss,
  onRetry,
  onRepair,
  pending = false,
  repairPending = false,
  repairError = null,
}: {
  diagnostics: readonly ScheduleDiagnostic[];
  teachers: readonly Teacher[];
  classes: readonly Class[];
  courses: ReadonlyArray<{ id: string; name: string }>;
  daySlotGroups: readonly DaySlotGroup[];
  assignments: readonly ClassAssignment[];
  onDismiss: () => void;
  onRetry: () => void;
  onRepair?: () => void;
  pending?: boolean;
  repairPending?: boolean;
  repairError?: string | null;
}) {
  const items = presentScheduleDiagnostics(diagnostics, {
    teachers,
    classes,
    courses,
    daySlotGroups,
    assignments,
  });
  const allResolved = items.length > 0 && items.every((item) => item.resolved);

  return (
    <section aria-labelledby="infeasible-diagnostics-title" aria-live="polite">
      <Card className="overflow-hidden border-amber-500/35">
        <CardHeader className="gap-2 pb-4">
          <div className="flex w-full items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  "rounded-xl p-2.5",
                  allResolved
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                )}
              >
                {allResolved ? (
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <CardTitle id="infeasible-diagnostics-title" className="text-lg leading-7">
                  گزارش تداخل‌های برنامه
                </CardTitle>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {allResolved
                    ? "موارد قبلی در اطلاعات فعلی برطرف شده‌اند؛ برای اطمینان، برنامه را دوباره تولید کنید."
                    : "این موارد مانع تولید برنامه شده‌اند. هر مورد را بررسی کنید و سپس برنامه را دوباره تولید کنید."}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={onDismiss}
              aria-label="بستن گزارش تداخل‌ها"
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="grid gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "min-w-0 rounded-xl border p-4 transition-colors",
                  item.resolved
                    ? "border-emerald-500/35 bg-emerald-500/5"
                    : "border-amber-500/30 bg-amber-500/5",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-6">{item.title}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "whitespace-nowrap",
                      item.resolved
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                    )}
                  >
                    {item.resolved ? "برطرف شد" : "نیاز به بررسی"}
                  </Badge>
                </div>

                <dl className="mt-3 space-y-1.5 rounded-lg bg-background/70 p-3">
                  <ConflictDetail label="کلاس‌ها" values={item.classes} />
                  <ConflictDetail label="معلم‌ها" values={item.teachers} />
                  <ConflictDetail label="درس" values={item.courses} />
                  {item.timeLabel ? (
                    <ConflictDetail label="زمان" values={[item.timeLabel]} />
                  ) : null}
                </dl>

                <div className="mt-3 space-y-2 text-sm leading-6">
                  <p>
                    <span className="font-medium">علت: </span>
                    <span className="text-muted-foreground">{item.reason}</span>
                  </p>
                  <p>
                    <span className="font-medium">پیشنهاد: </span>
                    <span className="text-muted-foreground">{item.suggestion}</span>
                  </p>
                </div>

                {!item.resolved && (item.teacherAction || item.classAction) ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                    {item.teacherAction ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/dashboard/teachers">
                          بررسی معلم
                          <ArrowLeft className="ms-1 h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : null}
                    {item.classAction ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/dashboard/classes">
                          بررسی کلاس
                          <ArrowLeft className="ms-1 h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>

          <div className="space-y-3 border-t pt-4">
            {onRepair ? (
              <p className="text-xs leading-5 text-muted-foreground">
                تعمیر برنامه فقط بررسی می‌کند با افزودن حداقل زمان حضور پیشنهادی برای معلمان، آیا
                برنامه‌ای قابل اجرا پیدا می‌شود؛ هیچ تغییری را ذخیره نمی‌کند.
              </p>
            ) : null}
            {repairError ? (
              <p role="alert" className="text-sm text-destructive">
                {repairError}
              </p>
            ) : null}
            {allResolved ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                برطرف‌شدن این موارد به معنی امکان‌پذیر بودن قطعی کل برنامه نیست؛ نتیجه نهایی فقط با
                تولید مجدد مشخص می‌شود.
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={onRetry}
                disabled={pending || repairPending}
                aria-busy={pending}
              >
                {pending ? (
                  <LoaderCircle
                    className="me-2 h-4 w-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <RefreshCcw className="me-2 h-4 w-4" aria-hidden="true" />
                )}
                {pending ? "در حال تولید…" : allResolved ? "تولید مجدد برنامه" : "تلاش دوباره"}
              </Button>
              {onRepair && !allResolved ? (
                <Button
                  variant="secondary"
                  onClick={onRepair}
                  disabled={pending || repairPending}
                  aria-busy={repairPending}
                >
                  {repairPending ? (
                    <LoaderCircle
                      className="me-2 h-4 w-4 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <Wrench className="me-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {repairPending ? "در حال بررسی…" : "تعمیر برنامه"}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
