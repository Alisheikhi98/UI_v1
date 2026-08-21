import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, Info, UserRoundCheck } from "lucide-react";
import { TimetablePreview } from "@/components/generator/timetable-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScheduleRepairResult } from "@/lib/scheduler";
import { normalizeCandidateTimetable } from "@/lib/timetable";
import type { ScheduleAssignmentCourseReference } from "@/lib/repositories";
import type { Class, DaySlotGroup, Teacher } from "@/lib/types";
import { getWeekdayDisplayLabel } from "@/lib/weekday-labels";

export function AvailabilityRepairResult({
  result,
  teachers,
  classes,
  assignmentCourseReferences,
  daySlotGroups,
}: {
  result: ScheduleRepairResult;
  teachers: readonly Teacher[];
  classes: readonly Class[];
  assignmentCourseReferences: readonly ScheduleAssignmentCourseReference[];
  daySlotGroups: readonly DaySlotGroup[];
}) {
  const teacherNames = new Map(teachers.map((teacher) => [teacher.id, teacher.name]));
  const daySlots = new Map(
    daySlotGroups.flatMap((group) =>
      group.slots.map(
        (slot) =>
          [
            slot.id,
            {
              day: getWeekdayDisplayLabel(group.dayName),
              slot: slot.slotNumber,
            },
          ] as const,
      ),
    ),
  );
  const repairAvailable = result.status === "REPAIR_AVAILABLE";
  const alreadyFeasible = result.status === "ALREADY_FEASIBLE";
  const noRepair = result.status === "NO_AVAILABILITY_REPAIR";
  const timetable = useMemo(
    () =>
      normalizeCandidateTimetable({
        candidate: { id: "availability-repair", lessons: result.lessons },
        schoolName: "مدرسه",
        classes,
        teachers,
        assignmentCourseReferences,
        daySlotGroups,
      }),
    [assignmentCourseReferences, classes, daySlotGroups, result.lessons, teachers],
  );
  const title = repairAvailable
    ? "پیشنهاد تعمیر آماده است"
    : alreadyFeasible
      ? "زمان حضور فعلی قابل استفاده است"
      : noRepair
        ? "تعمیر از طریق زمان حضور کافی نیست"
        : "تعمیر برنامه به نتیجه قابل استفاده نرسید";
  const description = repairAvailable
    ? result.minimumChangesProven
      ? "چیدمان کمترین زمان‌های حضور تکمیلی پیدا‌شده را پیشنهاد می‌کند. این پیشنهاد هنوز ذخیره نشده و برنامه نهایی را تغییر نمی‌دهد."
      : "چیدمان مجموعه‌ای از زمان‌های حضور تکمیلی پیدا کرده است، اما کمینه بودن آن‌ها اثبات نشده است. این پیشنهاد ذخیره نشده و برنامه نهایی را تغییر نمی‌دهد."
    : alreadyFeasible
      ? "طبق بررسی جدید سرور، زمان حضور فعلی معلمان می‌تواند یک برنامه قابل اجرا بسازد. تولید برنامه را دوباره امتحان کنید."
      : noRepair
        ? "تنها با اضافه‌کردن زمان حضور معلمان نمی‌توان این تداخل را برطرف کرد. محدودیت‌ها و تنظیمات کلاس‌ها را بررسی کنید."
        : "سرور نتوانست پیشنهاد قابل استفاده‌ای برای تعمیر ارائه کند. اطلاعات زمان‌بندی را بررسی کنید.";
  const StatusIcon = repairAvailable || alreadyFeasible ? CheckCircle2 : Info;

  return (
    <section aria-labelledby="repair-result-title" aria-live="polite">
      <Card className={repairAvailable ? "border-sky-500/30" : "border-border"}>
        <CardHeader className="gap-2 pb-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-700 dark:text-sky-400">
              <StatusIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <CardTitle id="repair-result-title" className="text-lg leading-7">
                {title}
              </CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {repairAvailable && result.proposedAvailabilityAdditions.length > 0 && (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">زمان‌های حضور پیشنهادی</p>
                <Badge variant="secondary">
                  {result.proposedAvailabilityAdditions.length.toLocaleString("fa-IR")} تغییر
                </Badge>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {result.proposedAvailabilityAdditions.map((addition) => {
                  const slot = daySlots.get(addition.daySlotId);
                  return (
                    <li
                      key={`${addition.teacherId}-${addition.daySlotId}`}
                      className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/30 p-3"
                    >
                      <UserRoundCheck
                        className="h-4 w-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {teacherNames.get(addition.teacherId) ?? "معلم مشخص‌شده"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {slot
                            ? `${slot.day} — زنگ ${slot.slot.toLocaleString("fa-IR")}`
                            : "زمان حضور مشخص‌شده"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {(repairAvailable || alreadyFeasible) && result.lessons.length > 0 && (
            <div className="overflow-hidden rounded-lg border">
              <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2.5">
                <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold">پیش‌نمایش برنامه قابل اجرا</p>
              </div>
              <TimetablePreview timetable={timetable} compact />
            </div>
          )}

          {repairAvailable && (
            <div className="flex flex-col gap-3 rounded-lg bg-muted/35 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-muted-foreground">
                برای اعمال پیشنهاد، زمان حضور معلمان را بررسی کنید و سپس تولید برنامه را دوباره اجرا
                کنید.
              </p>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link to="/dashboard/teachers">بررسی زمان حضور معلمان</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
