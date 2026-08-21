import type { PeriodTime } from "./api/schools-store";

export interface ScheduleUpdateResult {
  periods: PeriodTime[];
  error: string | null;
}

export type TimeInputState = "incomplete" | "invalid" | "valid";
export type PeriodTimeField = "start" | "end";
export type PeriodTimeDrafts = Record<string, string>;

const INVALID_TIME_MESSAGE = "زمان شروع هر زنگ باید قبل از زمان پایان آن باشد.";
const OVERLAP_MESSAGE = "زمان زنگ‌ها نباید با یکدیگر هم‌پوشانی داشته باشد.";
const INVALID_BREAK_MESSAGE = "مدت استراحت باید یک عدد صحیح و نامنفی باشد.";
const BREAK_TOO_LONG_MESSAGE = "این مدت استراحت با زمان پایان زنگ بعدی سازگار نیست.";
export const INCOMPLETE_TIME_MESSAGE = "زمان را به‌صورت کامل و معتبر وارد کنید؛ برای مثال ۱۱:۲۰.";

function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function getTimeInputState(value: string): TimeInputState {
  if (/^\d{2}:\d{2}$/.test(value)) return timeToMinutes(value) === null ? "invalid" : "valid";
  if (/^\d{0,2}(?::\d{0,2})?$/.test(value) && value.length < 5) return "incomplete";
  return "invalid";
}

export function periodTimeDraftKey(periodIndex: number, field: PeriodTimeField) {
  return `${periodIndex}:${field}`;
}

export function createPeriodTimeDrafts(periods: readonly PeriodTime[]): PeriodTimeDrafts {
  return Object.fromEntries(
    periods.flatMap((period) => [
      [periodTimeDraftKey(period.index, "start"), period.start],
      [periodTimeDraftKey(period.index, "end"), period.end],
    ]),
  );
}

export function applyPeriodTimeDrafts(
  periods: readonly PeriodTime[],
  drafts: Readonly<PeriodTimeDrafts>,
): PeriodTime[] | null {
  const result = periods.map((period) => ({
    ...period,
    start: drafts[periodTimeDraftKey(period.index, "start")] ?? period.start,
    end: drafts[periodTimeDraftKey(period.index, "end")] ?? period.end,
  }));
  return result.every(
    (period) =>
      getTimeInputState(period.start) === "valid" && getTimeInputState(period.end) === "valid",
  )
    ? result
    : null;
}

function formatMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function shiftTimeByMinutes(value: string, delta: number) {
  const current = timeToMinutes(value);
  if (current === null || !Number.isInteger(delta)) return value;
  const minutesInDay = 24 * 60;
  const shifted = (current + delta + minutesInDay) % minutesInDay;
  return formatMinutes(shifted);
}

export function getScheduleValidationError(periods: readonly PeriodTime[]) {
  for (let index = 0; index < periods.length; index += 1) {
    const period = periods[index];
    const start = timeToMinutes(period.start);
    const end = timeToMinutes(period.end);
    if (start === null || end === null || start >= end) return INVALID_TIME_MESSAGE;

    const nextPeriod = periods[index + 1];
    if (!nextPeriod) continue;
    const nextStart = timeToMinutes(nextPeriod.start);
    if (nextStart === null || end > nextStart) return OVERLAP_MESSAGE;
  }
  return null;
}

export function getBreakDuration(periods: readonly PeriodTime[], breakIndex: number) {
  const currentEnd = timeToMinutes(periods[breakIndex]?.end ?? "");
  const nextStart = timeToMinutes(periods[breakIndex + 1]?.start ?? "");
  if (currentEnd === null || nextStart === null || nextStart < currentEnd) return null;
  return nextStart - currentEnd;
}

export function updateBreakDuration(
  periods: readonly PeriodTime[],
  breakIndex: number,
  duration: number,
): ScheduleUpdateResult {
  if (!Number.isInteger(duration) || duration < 0) {
    return { periods: [...periods], error: INVALID_BREAK_MESSAGE };
  }

  const currentPeriod = periods[breakIndex];
  const nextPeriod = periods[breakIndex + 1];
  const currentEnd = timeToMinutes(currentPeriod?.end ?? "");
  const nextEnd = timeToMinutes(nextPeriod?.end ?? "");
  if (!currentPeriod || !nextPeriod || currentEnd === null || nextEnd === null) {
    return { periods: [...periods], error: INVALID_TIME_MESSAGE };
  }

  const nextStart = currentEnd + duration;
  if (nextStart >= nextEnd || nextStart >= 24 * 60) {
    return { periods: [...periods], error: BREAK_TOO_LONG_MESSAGE };
  }

  const updated = periods.map((period, index) =>
    index === breakIndex + 1 ? { ...period, start: formatMinutes(nextStart) } : { ...period },
  );
  const error = getScheduleValidationError(updated);
  return error ? { periods: [...periods], error } : { periods: updated, error: null };
}
