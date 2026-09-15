import type { TimetableEntry } from "@/lib/timetable";

export function TimetableCell({
  entry,
  secondaryText,
}: {
  entry?: TimetableEntry;
  secondaryText?: string;
}) {
  if (!entry) {
    return (
      <span
        className="block min-h-11 w-full select-none rounded-xl border border-dashed border-border/55 bg-muted/20"
        aria-label="زنگ خالی"
      />
    );
  }

  return (
    <div className="timetable-lesson-card min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-center leading-tight text-slate-950 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
      <p className="truncate text-xs font-bold sm:text-sm" title={entry.courseName}>
        {entry.courseName}
      </p>
      {secondaryText ? (
        <p
          className="mt-1 truncate text-[10px] font-medium text-slate-600 sm:text-[11px]"
          title={secondaryText}
        >
          {secondaryText}
        </p>
      ) : null}
    </div>
  );
}
