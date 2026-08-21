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
      <span className="select-none text-sm text-muted-foreground/35" aria-label="زنگ خالی">
        —
      </span>
    );
  }

  return (
    <div className="min-w-0 leading-tight">
      <p
        className="truncate text-xs font-semibold text-foreground sm:text-sm"
        title={entry.courseName}
      >
        {entry.courseName}
      </p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground" title={secondaryText}>
        {secondaryText ?? "—"}
      </p>
    </div>
  );
}
