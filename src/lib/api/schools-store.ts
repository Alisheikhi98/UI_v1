import { ApiError, apiRequest } from "./client";
import { SchoolRepository, type SchoolPersistenceAdapter } from "./school-repository";
import { BACKEND_WEEKDAY_NAMES, getWeekdayDisplayLabel } from "@/lib/weekday-labels";
import type { EducationStage } from "@/lib/academic-policy";

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === "true";

export interface PeriodTime {
  index: number;
  start: string;
  end: string;
}

export interface School {
  id: number;
  name: string;
  slug: string;
  educationStage: EducationStage;
  status: "active" | "inactive";
  dayOptions: SchoolDayOption[];
  workingDays: string[];
  timing: {
    periodsCount: number;
    dayStart: string;
    classDuration: number;
    breakDuration: number;
  };
  periods: PeriodTime[];
  createdAt: string;
}

export interface SchoolDayOption {
  id: number;
  name: string;
  label: string;
}

export type SchoolFormData = Pick<
  School,
  "name" | "slug" | "educationStage" | "workingDays" | "timing" | "periods"
>;

interface SchoolRead {
  id: number;
  name: string;
  slug: string;
  education_stage: EducationStage;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface PaginatedSchools {
  items: SchoolRead[];
  page: number;
  size: number;
  total: number;
  pages: number;
}

interface DaySlotResponse {
  id: number;
  school_id: number;
  day_id: number;
  slot_number: number;
  title: string | null;
  start_time: string | null;
  end_time: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface DaySlotEntry {
  start_time: string | null;
  end_time: string | null;
  day_id: number;
  slot_number: number;
  title?: string | null;
}

interface DaySlotDeleteCheckResponse {
  requires_confirmation: boolean;
}

interface WeeklyDaySlotsResponse {
  days: Array<{
    day_id: number;
    day_name: string;
    slots: DaySlotResponse[];
  }>;
}

export const WEEK_DAYS = BACKEND_WEEKDAY_NAMES.map(getWeekdayDisplayLabel);
export const DEFAULT_WORKING_DAYS = WEEK_DAYS.slice(0, 5);

const DEFAULT_TIMING = {
  periodsCount: 4,
  dayStart: "08:00",
  classDuration: 75,
  breakDuration: 15,
};

export function calculatePeriods(
  periodsCount: number,
  dayStart: string,
  classDuration: number,
  breakDuration: number,
): PeriodTime[] {
  const [hours, minutes] = dayStart.split(":").map(Number);
  let cursor = (hours || 0) * 60 + (minutes || 0);

  return Array.from({ length: periodsCount }, (_, index) => {
    const start = cursor;
    const end = start + classDuration;
    cursor = end + breakDuration;
    return { index: index + 1, start: formatMinutes(start), end: formatMinutes(end) };
  });
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function normalizeTime(value: string | null) {
  return value?.slice(0, 5) ?? null;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function deriveScheduling(week: WeeklyDaySlotsResponse) {
  const slots = week.days.flatMap((day) => day.slots);
  const activeSlots = slots.filter((slot) => slot.active);
  const dayOptions = week.days.map((day) => ({
    id: day.day_id,
    name: day.day_name,
    label: getWeekdayDisplayLabel(day.day_name),
  }));
  if (activeSlots.length === 0) {
    return {
      workingDays: [] as string[],
      dayOptions,
      timing: { ...DEFAULT_TIMING, periodsCount: 0 },
      periods: [] as PeriodTime[],
    };
  }

  const workingDayIds = [...new Set(activeSlots.map((slot) => slot.day_id))].sort((a, b) => a - b);
  const representativeDay = workingDayIds[0];
  const representativeSlots = activeSlots
    .filter((slot) => slot.day_id === representativeDay)
    .sort((a, b) => a.slot_number - b.slot_number);

  const periods: PeriodTime[] = representativeSlots.map((slot) => ({
    index: slot.slot_number,
    start: normalizeTime(slot.start_time) ?? DEFAULT_TIMING.dayStart,
    end: normalizeTime(slot.end_time) ?? DEFAULT_TIMING.dayStart,
  }));

  const firstPeriod = periods[0];
  const classDuration = firstPeriod
    ? Math.max(1, timeToMinutes(firstPeriod.end) - timeToMinutes(firstPeriod.start))
    : DEFAULT_TIMING.classDuration;
  const breakDuration = periods[1]
    ? Math.max(0, timeToMinutes(periods[1].start) - timeToMinutes(periods[0].end))
    : DEFAULT_TIMING.breakDuration;

  return {
    workingDays: workingDayIds
      .map((dayId) => dayOptions.find((day) => day.id === dayId)?.label)
      .filter((label): label is string => Boolean(label)),
    dayOptions,
    timing: {
      periodsCount: periods.length,
      dayStart: firstPeriod?.start ?? DEFAULT_TIMING.dayStart,
      classDuration,
      breakDuration,
    },
    periods,
  };
}

async function getSchoolWeek(schoolId: number) {
  return apiRequest<WeeklyDaySlotsResponse>(`/schools/${schoolId}/day-slots/week`);
}

function toSchool(school: SchoolRead, week: WeeklyDaySlotsResponse): School {
  return {
    id: school.id,
    name: school.name,
    slug: school.slug,
    educationStage: school.education_stage,
    status: school.active ? "active" : "inactive",
    ...deriveScheduling(week),
    createdAt: school.created_at,
  };
}

async function listAllSchoolRecords() {
  const firstPage = await apiRequest<PaginatedSchools>("/schools/?page=1&size=1");
  return firstPage.items;
}

async function getSchoolsFromApi(): Promise<School[]> {
  const schools = await listAllSchoolRecords();
  return Promise.all(
    schools.map(async (school) => toSchool(school, await getSchoolWeek(school.id))),
  );
}

export function buildDaySlotEntries(
  data: SchoolFormData,
  dayOptions: readonly SchoolDayOption[],
): DaySlotEntry[] {
  return data.workingDays.flatMap((day) => {
    const dayId = dayOptions.find((option) => option.label === day)?.id;
    if (!dayId) return [];
    return data.periods.map((period) => ({
      day_id: dayId,
      slot_number: period.index,
      start_time: period.start,
      end_time: period.end,
    }));
  });
}

export function getObsoleteDaySlots(
  existingSlots: readonly DaySlotResponse[],
  desiredEntries: readonly DaySlotEntry[],
) {
  const desiredKeys = new Set(
    desiredEntries.map((entry) => `${entry.day_id}:${entry.slot_number}`),
  );
  return existingSlots.filter(
    (slot) => slot.active && !desiredKeys.has(`${slot.day_id}:${slot.slot_number}`),
  );
}

async function saveDaySlots(schoolId: number, data: SchoolFormData) {
  const week = await getSchoolWeek(schoolId);
  const dayOptions = week.days.map((day) => ({
    id: day.day_id,
    name: day.day_name,
    label: getWeekdayDisplayLabel(day.day_name),
  }));
  const desiredEntries = buildDaySlotEntries(data, dayOptions);
  if (desiredEntries.length !== data.workingDays.length * data.periods.length) {
    throw new ApiError("یک یا چند روز کاری در تنظیمات فعلی سرور وجود ندارد.", 422);
  }
  const existingSlots = week.days.flatMap((day) => day.slots);
  const existingByKey = new Map(
    existingSlots.map((slot) => [`${slot.day_id}:${slot.slot_number}`, slot]),
  );
  const obsoleteSlots = getObsoleteDaySlots(existingSlots, desiredEntries);

  const newEntries = desiredEntries.filter(
    (entry) => !existingByKey.has(`${entry.day_id}:${entry.slot_number}`),
  );
  const existingEntries = desiredEntries.flatMap((entry) => {
    const slot = existingByKey.get(`${entry.day_id}:${entry.slot_number}`);
    return slot ? [{ entry, slot }] : [];
  });

  if (newEntries.length > 0) {
    await apiRequest<DaySlotResponse[]>(`/schools/${schoolId}/day-slots`, {
      method: "POST",
      body: JSON.stringify({ entries: newEntries }),
    });
  }

  await Promise.all(
    existingEntries.map(({ entry, slot }) =>
      apiRequest<DaySlotResponse>(`/schools/${schoolId}/day-slots/${slot.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          start_time: entry.start_time,
          end_time: entry.end_time,
          title: entry.title ?? null,
        }),
      }),
    ),
  );

  await Promise.all(
    obsoleteSlots.map(async (slot) => {
      const deleteCheck = await apiRequest<DaySlotDeleteCheckResponse>(
        `/schools/${schoolId}/day-slots/${slot.id}/delete-check`,
      );
      await apiRequest(`/schools/${schoolId}/day-slots/${slot.id}`, {
        method: "DELETE",
        body: JSON.stringify({
          confirm_delete_dependencies: deleteCheck.requires_confirmation,
        }),
      });
    }),
  );
}

async function createSchoolWithApi(data: SchoolFormData): Promise<School> {
  const created = await apiRequest<SchoolRead>("/schools/", {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      slug: data.slug,
      education_stage: data.educationStage,
    }),
  });
  await saveDaySlots(created.id, data);
  return toSchool(created, await getSchoolWeek(created.id));
}

async function updateSchoolWithApi({
  id,
  data,
}: {
  id: number;
  data: SchoolFormData;
}): Promise<School> {
  const updated = await apiRequest<SchoolRead>(`/schools/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: data.name, slug: data.slug }),
  });
  await saveDaySlots(id, data);
  return toSchool(updated, await getSchoolWeek(id));
}

async function deleteSchoolWithApi(id: number): Promise<void> {
  await apiRequest<void>(`/schools/${id}`, { method: "DELETE" });
}

const apiSchoolPersistenceAdapter: SchoolPersistenceAdapter = {
  getAll: getSchoolsFromApi,
  async getById(id) {
    const school = await apiRequest<SchoolRead>(`/schools/${id}`);
    return toSchool(school, await getSchoolWeek(id));
  },
  create: createSchoolWithApi,
  update: (id, data) => updateSchoolWithApi({ id, data }),
  delete: deleteSchoolWithApi,
};

const schoolPersistenceAdapter = USE_MOCK_API
  ? new (await import("./schools-mock")).MockSchoolPersistenceAdapter()
  : apiSchoolPersistenceAdapter;

export const schoolRepository = new SchoolRepository(schoolPersistenceAdapter);
