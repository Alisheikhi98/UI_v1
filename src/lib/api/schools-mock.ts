import type { School, SchoolFormData } from "./schools-store";

const STORAGE_KEY = "dev_mock_schools";

const initialSchools: School[] = [
  {
    id: 1,
    name: "Development School",
    slug: "development-school",
    status: "active",
    workingDays: ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه"],
    timing: { periodsCount: 4, dayStart: "08:00", classDuration: 75, breakDuration: 15 },
    periods: [
      { index: 1, start: "08:00", end: "09:15" },
      { index: 2, start: "09:30", end: "10:45" },
      { index: 3, start: "11:00", end: "12:15" },
      { index: 4, start: "12:30", end: "13:45" },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

let memorySchools = structuredClone(initialSchools);

function writeSchools(schools: School[]) {
  memorySchools = structuredClone(schools);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memorySchools));
  }
}

function readSchools(): School[] {
  if (typeof window === "undefined") return structuredClone(memorySchools);

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    writeSchools(memorySchools);
    return structuredClone(memorySchools);
  }

  try {
    memorySchools = JSON.parse(stored) as School[];
  } catch {
    memorySchools = structuredClone(initialSchools);
    writeSchools(memorySchools);
  }

  return structuredClone(memorySchools);
}

export async function getMockSchools(): Promise<School[]> {
  return readSchools();
}

export async function createMockSchool(data: SchoolFormData): Promise<School> {
  const schools = readSchools();
  const school: School = {
    ...structuredClone(data),
    id: schools.reduce((highest, item) => Math.max(highest, item.id), 0) + 1,
    createdAt: new Date().toISOString(),
  };
  writeSchools([...schools, school]);
  return structuredClone(school);
}

export async function updateMockSchool({
  id,
  data,
}: {
  id: number;
  data: SchoolFormData;
}): Promise<School> {
  const schools = readSchools();
  const index = schools.findIndex((school) => school.id === id);
  if (index === -1) throw new Error("School not found.");

  const updated: School = { ...structuredClone(data), id, createdAt: schools[index].createdAt };
  schools[index] = updated;
  writeSchools(schools);
  return structuredClone(updated);
}

export async function deleteMockSchool(id: number): Promise<void> {
  const schools = readSchools();
  if (!schools.some((school) => school.id === id)) throw new Error("School not found.");
  writeSchools(schools.filter((school) => school.id !== id));
}
