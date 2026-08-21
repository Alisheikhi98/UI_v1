import { Gauge, Repeat2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SchedulerConstraintControls({
  minimizeGaps,
  onMinimizeGapsChange,
  maxSameCourseSlotsPerDay,
  onMaxSameCourseSlotsPerDayChange,
  maximumPeriodsPerDay,
  error,
  disabled = false,
}: {
  minimizeGaps: boolean;
  onMinimizeGapsChange: (checked: boolean) => void;
  maxSameCourseSlotsPerDay: string;
  onMaxSameCourseSlotsPerDayChange: (value: string) => void;
  maximumPeriodsPerDay: number;
  error: string | null;
  disabled?: boolean;
}) {
  return (
    <div aria-label="تنظیمات زمان‌بندی" className="grid gap-3 border-t pt-4 sm:grid-cols-2">
      <div className="flex min-h-24 items-start gap-3 rounded-lg bg-muted/45 p-3">
        <div className="rounded-lg bg-background p-2 text-primary shadow-sm">
          <Gauge className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="minimize-teacher-gaps" className="leading-6">
              کاهش فاصله بین کلاس‌های معلم
            </Label>
            <Switch
              id="minimize-teacher-gaps"
              checked={minimizeGaps}
              onCheckedChange={onMinimizeGapsChange}
              disabled={disabled}
            />
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            با فعال بودن، موتور زمان‌بندی برنامه‌هایی با زنگ خالی کمتر برای معلمان را در اولویت قرار
            می‌دهد؛ این گزینه محدودیت قطعی نیست.
          </p>
        </div>
      </div>

      <div className="flex min-h-24 items-start gap-3 rounded-lg bg-muted/45 p-3">
        <div className="rounded-lg bg-background p-2 text-primary shadow-sm">
          <Repeat2 className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <Label htmlFor="max-course-repetitions" className="leading-6">
            حداکثر تکرار یک درس برای هر کلاس در روز
          </Label>
          <div className="mt-2 flex items-center gap-2">
            <Input
              id="max-course-repetitions"
              type="number"
              inputMode="numeric"
              min={1}
              max={maximumPeriodsPerDay > 0 ? maximumPeriodsPerDay : undefined}
              step={1}
              value={maxSameCourseSlotsPerDay}
              onChange={(event) => onMaxSameCourseSlotsPerDayChange(event.target.value)}
              placeholder="بدون محدودیت"
              aria-invalid={Boolean(error)}
              aria-describedby="max-course-repetitions-help"
              disabled={disabled || maximumPeriodsPerDay < 1}
              className="h-9 w-28 shrink-0 px-1 text-center placeholder:text-[11px] sm:placeholder:text-xs"
            />
            <span className="text-xs text-muted-foreground">بار در روز</span>
          </div>
          <p
            id="max-course-repetitions-help"
            className={`mt-1 text-xs leading-5 ${error ? "text-destructive" : "text-muted-foreground"}`}
          >
            {error ??
              (maximumPeriodsPerDay > 0
                ? `خالی یعنی بدون سقف جداگانه؛ حداکثر قابل انتخاب ${maximumPeriodsPerDay.toLocaleString("fa-IR")} است.`
                : "ابتدا زنگ‌های مدرسه را ثبت کنید.")}
          </p>
        </div>
      </div>
    </div>
  );
}
