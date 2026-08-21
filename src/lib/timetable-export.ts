import type { NormalizedTimetable, TimetableClass, TimetableViewMode } from "@/lib/timetable";

export interface TimetableExportColumn {
  id: string;
  label: string;
}

export interface TimetableExportCell {
  primaryText: string;
  secondaryText: string;
}

export interface TimetableExportRow {
  dayLabel: string;
  periodLabel: string;
  periodTime: string;
  cells: Record<string, TimetableExportCell | null>;
}

export interface TimetableExportModel {
  timetableId: string;
  schoolName: string;
  title: string;
  viewName: string;
  mode: TimetableViewMode;
  generatedAt: string;
  fileDate: string;
  columns: TimetableExportColumn[];
  rows: TimetableExportRow[];
}

const entryKey = (dayId: string, periodId: string, columnId: string) =>
  `${dayId}:${periodId}:${columnId}`;

export function createTimetableExportModel({
  timetable,
  mode,
  visibleClasses = timetable.classes,
  selectedClassId,
  selectedTeacherId,
  generatedAt = new Date(),
}: {
  timetable: NormalizedTimetable;
  mode: TimetableViewMode;
  visibleClasses?: readonly TimetableClass[];
  selectedClassId?: string;
  selectedTeacherId?: string;
  generatedAt?: Date;
}): TimetableExportModel | null {
  const classNames = new Map(timetable.classes.map((item) => [item.id, item.name] as const));
  const teacherNames = new Map(timetable.teachers.map((item) => [item.id, item.name] as const));
  const selectedClass = timetable.classes.find((item) => item.id === selectedClassId);
  const selectedTeacher = timetable.teachers.find((item) => item.id === selectedTeacherId);
  const columns: TimetableExportColumn[] =
    mode === "school"
      ? visibleClasses.map(({ id, name }) => ({ id, label: name }))
      : mode === "class" && selectedClass
        ? [{ id: selectedClass.id, label: selectedClass.name }]
        : mode === "teacher" && selectedTeacher
          ? [{ id: selectedTeacher.id, label: selectedTeacher.name }]
          : [];

  if (columns.length === 0) return null;

  const relevantEntries = timetable.entries.filter((entry) =>
    mode === "school"
      ? columns.some((column) => column.id === entry.classId)
      : mode === "class"
        ? entry.classId === selectedClassId
        : entry.teacherId === selectedTeacherId,
  );
  if (relevantEntries.length === 0) return null;

  const entries = new Map(
    relevantEntries.map((entry) => [
      entryKey(entry.dayId, entry.periodId, mode === "teacher" ? entry.teacherId : entry.classId),
      entry,
    ]),
  );
  const viewName =
    mode === "school"
      ? "نمای مدرسه"
      : mode === "class"
        ? `نمای کلاس — ${selectedClass?.name ?? ""}`
        : `نمای معلم — ${selectedTeacher?.name ?? ""}`;

  return {
    timetableId: timetable.id,
    schoolName: timetable.schoolName,
    title: "برنامه هفتگی مدرسه",
    viewName,
    mode,
    generatedAt: generatedAt.toLocaleString("fa-IR"),
    fileDate: generatedAt.toISOString().slice(0, 10),
    columns,
    rows: timetable.days.flatMap((day) =>
      timetable.periods.map((period) => ({
        dayLabel: day.label,
        periodLabel: period.label,
        periodTime: period.time,
        cells: Object.fromEntries(
          columns.map((column) => {
            const entry = entries.get(entryKey(day.id, period.id, column.id));
            return [
              column.id,
              entry
                ? {
                    primaryText: entry.courseName,
                    secondaryText:
                      mode === "teacher"
                        ? (classNames.get(entry.classId) ?? "کلاس حذف‌شده")
                        : (teacherNames.get(entry.teacherId) ?? "معلم حذف‌شده"),
                  }
                : null,
            ];
          }),
        ),
      })),
    ),
  };
}

export function getTimetableExportFilename(model: TimetableExportModel, extension: string) {
  const scope = model.mode === "school" ? "school" : model.mode;
  return `chiideman-${scope}-timetable-${model.fileDate}.${extension}`;
}

export class TimetablePrintError extends Error {
  constructor(readonly code: "POPUP_BLOCKED" | "PREPARATION_FAILED") {
    super(code);
    this.name = "TimetablePrintError";
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createTimetablePrintHtml(model: TimetableExportModel) {
  const table =
    model.mode === "school" ? createSchoolPrintTable(model) : createEntityPrintTable(model);

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(getTimetableExportFilename(model, "pdf"))}</title>
  <style>
    @page { size: landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { direction: rtl; }
    body { margin: 0; color: #172033; font-family: Tahoma, Arial, sans-serif; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    header { margin-bottom: 12px; text-align: center; break-after: avoid; page-break-after: avoid; }
    h1 { margin: 0 0 6px; font-size: 20px; }
    p { margin: 2px 0 0; color: #5f6878; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    table.school { table-layout: fixed; font-size: 8.5px; }
    table.entity { table-layout: fixed; font-size: 10px; }
    th, td { border: 1px solid #b9c2d0; padding: 6px 4px; text-align: center; vertical-align: middle; }
    table.school th, table.school td { padding: 4px 3px; overflow-wrap: anywhere; }
    thead th { background: #e8eef8; font-weight: 700; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    col.day { width: 7%; }
    col.period { width: 9%; }
    table.entity col.day { width: 14%; }
    table.entity col.period { width: 15%; }
    table.entity col.time { width: 16%; }
    table.entity col.primary, table.entity col.secondary { width: 27.5%; }
    tbody th { background: #f4f6fa; }
    strong, small { display: block; }
    small { margin-top: 3px; color: #5f6878; font-size: 8px; }
    tr, th, td { break-inside: avoid; page-break-inside: avoid; }
    @media print {
      header { position: relative; }
      table { orphans: 2; widows: 2; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(model.title)}${model.schoolName ? ` — ${escapeHtml(model.schoolName)}` : ""}</h1>
    <p>${escapeHtml(model.viewName)}</p>
    <p>تاریخ تهیه: ${escapeHtml(model.generatedAt)}</p>
  </header>
  ${table}
</body>
</html>`;
}

function createSchoolPrintTable(model: TimetableExportModel) {
  const columnHeaders = model.columns
    .map((column) => `<th scope="col">${escapeHtml(column.label)}</th>`)
    .join("");
  const rows = model.rows
    .map((row, index) => {
      const startsDay = index === 0 || model.rows[index - 1]?.dayLabel !== row.dayLabel;
      let dayRowSpan = 1;
      while (model.rows[index + dayRowSpan]?.dayLabel === row.dayLabel) dayRowSpan += 1;
      const dayCell = startsDay
        ? `<th scope="rowgroup" rowspan="${dayRowSpan}">${escapeHtml(row.dayLabel)}</th>`
        : "";
      const cells = model.columns
        .map((column) => {
          const cell = row.cells[column.id];
          return cell
            ? `<td><strong>${escapeHtml(cell.primaryText)}</strong><small>${escapeHtml(cell.secondaryText)}</small></td>`
            : "<td>—</td>";
        })
        .join("");
      return `<tr>${dayCell}<th scope="row">${escapeHtml(row.periodLabel)}<small>${escapeHtml(row.periodTime)}</small></th>${cells}</tr>`;
    })
    .join("");

  return `<table class="school" aria-label="${escapeHtml(model.viewName)}">
    <colgroup><col class="day"><col class="period">${model.columns.map(() => "<col>").join("")}</colgroup>
    <thead><tr><th scope="col">روز</th><th scope="col">زنگ</th>${columnHeaders}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function createEntityPrintTable(model: TimetableExportModel) {
  const entityColumn = model.columns[0];
  const secondaryHeading = model.mode === "teacher" ? "کلاس" : "معلم";
  const rows = model.rows
    .map((row) => {
      const cell = entityColumn ? row.cells[entityColumn.id] : null;
      return `<tr>
        <th scope="row">${escapeHtml(row.dayLabel)}</th>
        <td>${escapeHtml(row.periodLabel)}</td>
        <td>${escapeHtml(row.periodTime)}</td>
        <td><strong>${cell ? escapeHtml(cell.primaryText) : "—"}</strong></td>
        <td>${cell ? escapeHtml(cell.secondaryText) : "—"}</td>
      </tr>`;
    })
    .join("");

  return `<table class="entity" aria-label="${escapeHtml(model.viewName)}">
    <colgroup><col class="day"><col class="period"><col class="time"><col class="primary"><col class="secondary"></colgroup>
    <thead><tr><th scope="col">روز</th><th scope="col">زنگ</th><th scope="col">زمان</th><th scope="col">درس</th><th scope="col">${secondaryHeading}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export async function printTimetablePdf(model: TimetableExportModel) {
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) throw new TimetablePrintError("POPUP_BLOCKED");

  try {
    printWindow.document.open();
    printWindow.document.write(createTimetablePrintHtml(model));
    printWindow.document.close();
    await printWindow.document.fonts?.ready;
    await waitForPrintLayout(printWindow);
    printWindow.addEventListener(
      "afterprint",
      () => {
        if (!printWindow.closed) printWindow.close();
      },
      { once: true },
    );
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    if (!printWindow.closed) printWindow.close();
    if (error instanceof TimetablePrintError) throw error;
    throw new TimetablePrintError("PREPARATION_FAILED");
  }
}

function waitForPrintLayout(printWindow: Window) {
  return new Promise<void>((resolve) => {
    printWindow.requestAnimationFrame(() => {
      printWindow.requestAnimationFrame(() => resolve());
    });
  });
}

export function getTimetablePdfErrorMessage(error: unknown) {
  return error instanceof TimetablePrintError && error.code === "POPUP_BLOCKED"
    ? "پنجره چاپ توسط مرورگر مسدود شد. اجازه بازشدن پنجره را فعال کنید."
    : "آماده‌سازی PDF انجام نشد.";
}
