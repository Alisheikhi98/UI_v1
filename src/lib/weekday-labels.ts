export const BACKEND_WEEKDAY_NAMES = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

const PERSIAN_WEEKDAY_BY_NAME: Readonly<Record<string, string>> = {
  saturday: "شنبه",
  sunday: "یکشنبه",
  monday: "دوشنبه",
  tuesday: "سه‌شنبه",
  wednesday: "چهارشنبه",
  thursday: "پنجشنبه",
  friday: "جمعه",
};

export function getWeekdayDisplayLabel(value: string | number | null | undefined): string {
  if (typeof value === "number") {
    return getWeekdayDisplayLabel(BACKEND_WEEKDAY_NAMES[value - 1] ?? String(value));
  }

  const originalValue = value?.trim() ?? "";
  if (!originalValue) return "روز نامشخص";
  return PERSIAN_WEEKDAY_BY_NAME[originalValue.toLocaleLowerCase("en-US")] ?? originalValue;
}
