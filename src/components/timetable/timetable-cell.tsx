import type { TimetableEntry } from "@/lib/timetable";

export function TimetableCell({
  entry,
  secondaryText,
}: {
  entry?: TimetableEntry;
  secondaryText?: string;
}) {
  if (!entry) return <span className="text-muted-foreground/35">—</span>;

  return (
    <div className="leading-tight">
      <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
        {entry.courseName}
      </p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">{secondaryText ?? "—"}</p>
    </div>
  );
}
