import type { SchoolPersistenceAdapter } from "@/lib/api/school-repository";
import type { School, SchoolFormData } from "@/lib/api/schools-store";
import { BACKEND_WEEKDAY_NAMES, getWeekdayDisplayLabel } from "../weekday-labels.ts";

const STORAGE_KEY = "dev_mock_schools";

const INITIAL_SCHOOLS: readonly School[] = [
  {
    id: 1,
    name: "Development School",
    slug: "development-school",
    status: "active",
    workingDays: BACKEND_WEEKDAY_NAMES.slice(0, 5).map(getWeekdayDisplayLabel),
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

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const clone = <T>(value: T): T => structuredClone(value);

export class MockSchoolPersistenceAdapter implements SchoolPersistenceAdapter {
  private readonly storage: StorageAdapter | null;

  constructor(
    storage: StorageAdapter | null = typeof window === "undefined" ? null : window.localStorage,
  ) {
    this.storage = storage;
  }

  async getAll(): Promise<School[]> {
    return this.read();
  }

  async getById(id: number): Promise<School | null> {
    return this.read().find((school) => school.id === id) ?? null;
  }

  async create(data: SchoolFormData): Promise<School> {
    const schools = this.read();
    const school: School = {
      ...clone(data),
      id: schools.reduce((highest, item) => Math.max(highest, item.id), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    this.write([...schools, school]);
    return clone(school);
  }

  async update(id: number, data: SchoolFormData): Promise<School> {
    const schools = this.read();
    const current = schools.find((school) => school.id === id);
    if (!current) throw new Error("School not found.");

    const updated: School = { ...clone(data), id, createdAt: current.createdAt };
    this.write(schools.map((school) => (school.id === id ? updated : school)));
    return clone(updated);
  }

  async delete(id: number): Promise<void> {
    const schools = this.read();
    if (!schools.some((school) => school.id === id)) throw new Error("School not found.");
    this.write(schools.filter((school) => school.id !== id));
  }

  private read(): School[] {
    if (!this.storage) return clone([...INITIAL_SCHOOLS]);

    const stored = this.storage.getItem(STORAGE_KEY);
    if (!stored) {
      const seeded = clone([...INITIAL_SCHOOLS]);
      this.write(seeded);
      return seeded;
    }

    try {
      return JSON.parse(stored) as School[];
    } catch {
      const seeded = clone([...INITIAL_SCHOOLS]);
      this.write(seeded);
      return seeded;
    }
  }

  private write(schools: School[]) {
    if (!this.storage) return;
    this.storage.setItem(STORAGE_KEY, JSON.stringify(clone(schools)));
  }
}
