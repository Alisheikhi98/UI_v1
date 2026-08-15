import { CalendarDays, CheckCircle2, ExternalLink } from "lucide-react";
import { TimetablePreview } from "@/components/generator/timetable-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScheduleCandidateDetail } from "@/lib/scheduler";
import type { Class, Course, DaySlotGroup, Teacher } from "@/lib/types";

export function GeneratedSchedulePreview({
  schedule,
  daySlotGroups,
  classes,
  teachers,
  courses,
  onOpenFullPreview,
  onConfirm,
  onOpenWeeklyTimetable,
  confirming,
  confirmed,
  confirmationReady,
}: {
  schedule: ScheduleCandidateDetail;
  daySlotGroups: DaySlotGroup[];
  classes: Class[];
  teachers: Teacher[];
  courses: Course[];
  onOpenFullPreview: () => void;
  onConfirm: () => void;
  onOpenWeeklyTimetable: () => void;
  confirming: boolean;
  confirmed: boolean;
  confirmationReady: boolean;
}) {
  return (
    <section aria-labelledby="generated-preview-title">
      <Card className="overflow-hidden border-primary/20">
        <CardHeader className="gap-4 pb-4">
          <div>
            <CardTitle id="generated-preview-title" className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
              پیش‌نمایش برنامه مدرسه
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              نمایی فشرده از برنامه پیشنهادی همه کلاس‌های مدرسه
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          <div className="border-y">
            <TimetablePreview
              candidate={schedule}
              daySlotGroups={daySlotGroups}
              classes={classes}
              teachers={teachers}
              courses={courses}
              compact
            />
          </div>

          <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              برای مشاهده همه جزئیات می‌توانید پیش‌نمایش کامل را باز کنید.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={confirmed ? onOpenWeeklyTimetable : onOpenFullPreview}
              >
                <ExternalLink className="me-2 h-4 w-4" />
                {confirmed ? "مشاهده برنامه هفتگی" : "مشاهده برنامه کامل"}
              </Button>
              <Button
                onClick={onConfirm}
                disabled={confirming || confirmed || !confirmationReady}
                title={
                  confirmationReady
                    ? undefined
                    : "وضعیت برنامه هفتگی فعلی هنوز از سرور دریافت نشده است."
                }
              >
                <CheckCircle2 className="me-2 h-4 w-4" />
                {confirming ? "در حال ثبت..." : confirmed ? "برنامه ثبت شد" : "انتخاب و ثبت برنامه"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
