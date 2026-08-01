import { useSyncExternalStore } from "react";

const STORAGE_KEY = "active_school_id";
let activeSchoolId: string | null = null;
const listeners = new Set<() => void>();

function readStoredSchoolId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function getSnapshot() {
  if (activeSchoolId === null) activeSchoolId = readStoredSchoolId();
  return activeSchoolId;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActiveSchoolId(): string | null {
  return getSnapshot();
}

export function setActiveSchoolId(schoolId: string | number | null) {
  activeSchoolId = schoolId === null ? null : String(schoolId);
  if (typeof window !== "undefined") {
    if (activeSchoolId === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, activeSchoolId);
  }
  listeners.forEach((listener) => listener());
}

export function resolveActiveSchoolId(
  persistedSchoolId: string | null,
  accessibleSchoolIds: readonly (string | number)[],
): string | null {
  const normalizedIds = accessibleSchoolIds.map(String);
  if (persistedSchoolId !== null && normalizedIds.includes(persistedSchoolId)) {
    return persistedSchoolId;
  }
  return normalizedIds[0] ?? null;
}

export function useActiveSchoolId() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
