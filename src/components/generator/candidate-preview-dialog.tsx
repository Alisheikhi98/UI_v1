import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TimetablePreview } from "@/components/generator/timetable-preview";
import { scheduleStatusLabel, type ScheduleCandidateDetail } from "@/lib/scheduler";
import type { NormalizedTimetable } from "@/lib/timetable";

export function CandidatePreviewDialog({
  candidate,
  open,
  loading,
  error,
  timetable,
  onOpenChange,
}: {
  candidate: ScheduleCandidateDetail | null;
  open: boolean;
  loading: boolean;
  error: boolean;
  timetable: NormalizedTimetable | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="flex h-[92vh] w-[96vw] max-w-7xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5 text-right sm:text-right">
          <div className="flex flex-wrap items-center gap-2 pe-8">
            <DialogTitle>پیش‌نمایش کامل برنامه پیشنهادی مدرسه</DialogTitle>
            {candidate && (
              <Badge variant="secondary">{scheduleStatusLabel(candidate.status)}</Badge>
            )}
          </div>
          <DialogDescription>
            برنامه تولیدشده همه کلاس‌های مدرسه را پیش از نهایی‌سازی بررسی کنید.
          </DialogDescription>
        </DialogHeader>
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          data-testid="candidate-preview-dialog-body"
        >
          {loading && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              در حال دریافت برنامه...
            </p>
          )}
          {error && (
            <p className="py-12 text-center text-sm text-destructive">
              دریافت جزئیات برنامه با خطا مواجه شد.
            </p>
          )}
          {candidate && timetable && !loading && !error && (
            <TimetablePreview timetable={timetable} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
