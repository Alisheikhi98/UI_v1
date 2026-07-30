import { ApiError, apiRequest } from "./client";
import { SchoolRepository, type SchoolPersistenceAdapter } from "./school-repository";
import { MockSchoolPersistenceAdapter } from "./schools-mock";

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
  status: "active" | "inactive";
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

export type SchoolFormData = Omit<School, "id" | "createdAt">;

interface SchoolRead {
  id: number;
  name: string;
  slug: string;
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
  active: boolean;
}

export const WEEK_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
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

function deriveScheduling(slots: DaySlotResponse[]) {
  const activeSlots = slots.filter((slot) => slot.active);
  if (activeSlots.length === 0) {
    return {
      workingDays: [] as string[],
      timing: DEFAULT_TIMING,
      periods: calculatePeriods(
        DEFAULT_TIMING.periodsCount,
        DEFAULT_TIMING.dayStart,
        DEFAULT_TIMING.classDuration,
        DEFAULT_TIMING.breakDuration,
      ),
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
    workingDays: workingDayIds.map((dayId) => WEEK_DAYS[dayId - 1]).filter(Boolean),
    timing: {
      periodsCount: periods.length,
      dayStart: firstPeriod?.start ?? DEFAULT_TIMING.dayStart,
      classDuration,
      breakDuration,
    },
    periods,
  };
}

async function getSchoolDaySlots(schoolId: number) {
  return apiRequest<DaySlotResponse[]>(`/schools/${schoolId}/day-slots`);
}

function toSchool(school: SchoolRead, slots: DaySlotResponse[]): School {
  return {
    id: school.id,
    name: school.name,
    slug: school.slug,
    status: school.active ? "active" : "inactive",
    ...deriveScheduling(slots),
    createdAt: school.created_at,
  };
}

async function listAllSchoolRecords() {
  const firstPage = await apiRequest<PaginatedSchools>("/schools/?page=1&size=100");
  const pages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.pages - 1) }, (_, index) =>
      apiRequest<PaginatedSchools>(`/schools/?page=${index + 2}&size=100`),
    ),
  );
  return [firstPage, ...pages].flatMap((page) => page.items);
}

async function getSchoolsFromApi(): Promise<School[]> {
  const schools = await listAllSchoolRecords();
  return Promise.all(
    schools.map(async (school) => toSchool(school, await getSchoolDaySlots(school.id))),
  );
}

function buildDaySlotEntries(data: SchoolFormData): DaySlotEntry[] {
  return data.workingDays.flatMap((day) => {
    const dayId = WEEK_DAYS.indexOf(day) + 1;
    if (dayId === 0) return [];
    return data.periods.map((period) => ({
      day_id: dayId,
      slot_number: period.index,
      start_time: period.start,
      end_time: period.end,
      active: true,
    }));
  });
}

async function saveDaySlots(schoolId: number, data: SchoolFormData) {
  const desiredEntries = buildDaySlotEntries(data);
  if (desiredEntries.length === 0) return;

  const existingSlots = await getSchoolDaySlots(schoolId);
  const desiredKeys = new Set(
    desiredEntries.map((entry) => `${entry.day_id}:${entry.slot_number}`),
  );
  const obsoleteSlots = existingSlots.filter(
    (slot) => slot.active && !desiredKeys.has(`${slot.day_id}:${slot.slot_number}`),
  );

  await apiRequest<DaySlotResponse[]>(`/schools/${schoolId}/day-slots`, {
    method: "POST",
    body: JSON.stringify({ entries: desiredEntries }),
  });

  await Promise.all(
    obsoleteSlots.map((slot) =>
      apiRequest(`/schools/${schoolId}/day-slots/${slot.id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirm_delete_dependencies: false }),
      }),
    ),
  );
}

async function createSchoolWithApi(data: SchoolFormData): Promise<School> {
  if (data.status !== "active") {
    throw new ApiError("API ایجاد مدرسه از وضعیت غیرفعال پشتیبانی نمی‌کند.", 422);
  }

  const created = await apiRequest<SchoolRead>("/schools/", {
    method: "POST",
    body: JSON.stringify({ name: data.name, slug: data.slug }),
  });
  await saveDaySlots(created.id, data);
  return toSchool(created, await getSchoolDaySlots(created.id));
}

async function updateSchoolWithApi({
  id,
  data,
}: {
  id: number;
  data: SchoolFormData;
}): Promise<School> {
  const current = await apiRequest<SchoolRead>(`/schools/${id}`);
  if (data.status !== (current.active ? "active" : "inactive")) {
    throw new ApiError("OpenAPI برای تغییر وضعیت مدرسه endpoint تعریف نکرده است.", 422);
  }

  const updated = await apiRequest<SchoolRead>(`/schools/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: data.name, slug: data.slug }),
  });
  await saveDaySlots(id, data);
  return toSchool(updated, await getSchoolDaySlots(id));
}

async function deleteSchoolWithApi(): Promise<never> {
  throw new ApiError("OpenAPI برای حذف مدرسه endpoint تعریف نکرده است.", 405);
}

const apiSchoolPersistenceAdapter: SchoolPersistenceAdapter = {
  getAll: getSchoolsFromApi,
  async getById(id) {
    const school = await apiRequest<SchoolRead>(`/schools/${id}`);
    return toSchool(school, await getSchoolDaySlots(id));
  },
  create: createSchoolWithApi,
  update: (id, data) => updateSchoolWithApi({ id, data }),
  delete: () => deleteSchoolWithApi(),
};

export const schoolRepository = new SchoolRepository(
  USE_MOCK_API ? new MockSchoolPersistenceAdapter() : apiSchoolPersistenceAdapter,
);
