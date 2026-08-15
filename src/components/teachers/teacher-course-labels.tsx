import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createTeacherCourseLabelModel } from "@/lib/teacher-course-labels";

export function TeacherCourseLabels({
  labels,
  loading,
  error,
}: {
  labels: readonly string[];
  loading: boolean;
  error: boolean;
}) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        در حال بارگذاری...
      </span>
    );
  }

  if (error) {
    return (
      <span className="whitespace-nowrap text-xs text-destructive">دریافت دروس ناموفق بود</span>
    );
  }

  if (labels.length === 0) {
    return <span className="whitespace-nowrap text-xs text-muted-foreground">بدون درس</span>;
  }

  const { visibleLabels, hiddenLabels, hiddenCount } = createTeacherCourseLabelModel(labels);

  return (
    <div className="mx-auto flex min-w-0 max-w-80 flex-nowrap items-center justify-center gap-1 overflow-hidden">
      {visibleLabels.map((label) => (
        <Badge key={label} variant="secondary" className="shrink-0 whitespace-nowrap text-xs">
          {label}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`نمایش ${hiddenCount.toLocaleString("fa-IR")} درس دیگر: ${hiddenLabels.join("، ")}`}
              >
                +{hiddenCount.toLocaleString("fa-IR")}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64 text-right" dir="rtl">
              {hiddenLabels.join("، ")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
