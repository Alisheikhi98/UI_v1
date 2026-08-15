import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, ChevronLeft, ClipboardCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getBlockingIssueCount,
  type GeneratorReadinessIssue,
  type GeneratorReadinessItem,
} from "@/lib/scheduler";

export function GeneratorReadiness({
  items,
  issues,
  onGenerate,
  pending = false,
}: {
  items: GeneratorReadinessItem[];
  issues: GeneratorReadinessIssue[];
  onGenerate?: () => void;
  pending?: boolean;
}) {
  const ready = items.length > 0 && items.every((item) => item.status === "ready");
  const blockingCount = getBlockingIssueCount(items);

  return (
    <section aria-labelledby="readiness-title">
      <Card className={ready ? "border-emerald-500/25" : "border-amber-500/35"}>
        <CardHeader className="gap-3 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-xl p-2.5 ${ready ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}
              >
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle id="readiness-title" className="text-lg">
                  وضعیت آمادگی
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ready
                    ? "اطلاعات لازم برای تولید برنامه آماده است."
                    : `${blockingCount.toLocaleString("fa-IR")} مورد برای تولید برنامه نیاز به تکمیل دارد.`}
                </p>
              </div>
            </div>
            <Badge variant={ready ? "default" : "secondary"} className="w-fit gap-1.5">
              {ready ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {ready ? "آماده تولید" : "نیاز به تکمیل"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex min-h-16 items-center justify-between gap-3 rounded-lg bg-muted/45 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.value}</p>
                </div>
                {item.status === "ready" ? (
                  <CheckCircle2
                    aria-label="آماده"
                    className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                ) : (
                  <AlertTriangle
                    aria-label="نیاز به تکمیل"
                    className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                  />
                )}
              </div>
            ))}
          </div>

          {!ready && issues.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-semibold">موارد قابل پیگیری</p>
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex flex-col gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{issue.title}</p>
                    <p className="text-xs text-muted-foreground">{issue.message}</p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link to={issue.actionHref}>
                      {issue.actionLabel ?? "رفع مشکل"}
                      <ChevronLeft className="ms-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}

          {onGenerate && (
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {ready
                  ? "همه اطلاعات ضروری آماده است؛ می‌توانید تولید برنامه را آغاز کنید."
                  : "برای فعال شدن تولید برنامه، ابتدا اطلاعات ناقص بخش آمادگی را تکمیل کنید."}
              </p>
              <Button
                size="lg"
                onClick={onGenerate}
                disabled={!ready || pending}
                className="min-w-48 shrink-0"
              >
                <Sparkles className="me-2 h-4 w-4" />
                {pending ? "در حال تولید..." : "تولید برنامه"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
