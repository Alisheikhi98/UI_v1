import type { TimetableViewMode } from "@/lib/timetable";

export function TimetableViewHeader({
  mode,
  schoolName,
  selectedClassName,
  selectedTeacherName,
}: {
  mode: TimetableViewMode;
  schoolName: string;
  selectedClassName?: string;
  selectedTeacherName?: string;
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
    <div className="border-b bg-background px-3 py-2.5 sm:px-4" data-testid="timetable-view-header">
      <h2 className="text-sm font-semibold text-foreground sm:text-base">{title}</h2>
      {mode === "school" && <p className="mt-0.5 text-xs text-muted-foreground">{schoolName}</p>}
    </div>
  );
}
