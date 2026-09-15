import type { ReactNode } from "react";
import type { TimetableViewMode } from "@/lib/timetable";

export function TimetableViewHeader({
  mode,
  schoolName,
  selectedClassName,
  selectedTeacherName,
  children,
}: {
  mode: TimetableViewMode;
  schoolName: string;
  selectedClassName?: string;
  selectedTeacherName?: string;
  children?: ReactNode;
}) {
  const title =
    mode === "school"
      ? `نمای کلی برنامه مدرسه ${schoolName}`
      : mode === "class" && selectedClassName
        ? `برنامه هفتگی کلاس ${selectedClassName}`
        : mode === "teacher" && selectedTeacherName
          ? `برنامه هفتگی ${selectedTeacherName}`
          : null;

  if (!title) return null;

  return (
    <div
      className="flex flex-col gap-3 border-b bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
      data-testid="timetable-view-header"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-wide text-primary">
          برنامه نهایی منتشرشده
        </p>
        <h2 className="mt-0.5 text-sm font-bold text-foreground sm:text-base">{title}</h2>
      </div>
      {children}
    </div>
  );
}
