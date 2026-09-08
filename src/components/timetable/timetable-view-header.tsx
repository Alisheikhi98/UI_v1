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
      ? "برنامه جامع مدرسه"
      : mode === "class" && selectedClassName
        ? `برنامه کلاس ${selectedClassName}`
        : mode === "teacher" && selectedTeacherName
          ? `برنامه هفتگی ${selectedTeacherName}`
          : null;

  if (!title) return null;

  return (
    <div
      className="flex flex-col gap-2 border-b bg-background px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4"
      data-testid="timetable-view-header"
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground sm:text-base">{title}</h2>
        {mode === "school" && <p className="mt-0.5 text-xs text-muted-foreground">{schoolName}</p>}
      </div>
      {children}
    </div>
  );
}
