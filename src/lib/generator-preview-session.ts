import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ScheduleDiagnostic } from "@/lib/scheduler";

const PREVIEW_STORAGE_PREFIX = "generator-preview:v1:";
const CONFLICT_STORAGE_PREFIX = "generator-conflict:v1:";
const listeners = new Set<() => void>();

export interface GeneratorPreviewReference {
  schoolId: string;
  candidateId: string;
  generatedAt: string;
}

export interface GeneratorConflictReportReference {
  schoolId: string;
  reportedAt: string;
  diagnostics: ScheduleDiagnostic[];
}

function storageKey(prefix: string, userId: string, schoolId: string) {
  return `${prefix}${encodeURIComponent(userId)}:${encodeURIComponent(schoolId)}`;
}

function readStoredValue(key: string | null) {
  if (!key || typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function parsePreviewReference(value: string | null, schoolId: string | null) {
  if (!value || !schoolId) return null;
  try {
    const parsed = JSON.parse(value) as Partial<GeneratorPreviewReference>;
    if (
      parsed.schoolId !== schoolId ||
      typeof parsed.candidateId !== "string" ||
      !parsed.candidateId.trim() ||
      typeof parsed.generatedAt !== "string" ||
      Number.isNaN(new Date(parsed.generatedAt).getTime())
    ) {
      return null;
    }
    return {
      schoolId,
      candidateId: parsed.candidateId,
      generatedAt: parsed.generatedAt,
    };
  } catch {
    return null;
  }
}

function isScheduleDiagnostic(value: unknown): value is ScheduleDiagnostic {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  const diagnostic = value as Record<string, unknown>;
  const isId = (item: unknown) => typeof item === "string" && item.length > 0;
  const isCount = (item: unknown) =>
    typeof item === "number" && Number.isSafeInteger(item) && item >= 0;
  const validLessons = (key: "classId" | "teacherId") =>
    Array.isArray(diagnostic.lessons) &&
    diagnostic.lessons.every(
      (lesson) =>
        lesson !== null &&
        typeof lesson === "object" &&
        isId((lesson as Record<string, unknown>).courseId) &&
        isId((lesson as Record<string, unknown>)[key]),
    );

  if (diagnostic.type === "unknown") return true;
  if (diagnostic.type === "assignment-shortage") {
    return (
      isId(diagnostic.assignmentId) &&
      isId(diagnostic.teacherId) &&
      isId(diagnostic.courseId) &&
      isId(diagnostic.classId) &&
      isCount(diagnostic.requiredSlots) &&
      isCount(diagnostic.assignedSlots) &&
      isCount(diagnostic.unmetSlots)
    );
  }
  if (diagnostic.type === "teacher-conflict") {
    return (
      isId(diagnostic.teacherId) &&
      isId(diagnostic.day) &&
      isCount(diagnostic.slot) &&
      validLessons("classId")
    );
  }
  if (diagnostic.type === "class-conflict") {
    return (
      isId(diagnostic.classId) &&
      isId(diagnostic.day) &&
      isCount(diagnostic.slot) &&
      validLessons("teacherId")
    );
  }
  if (diagnostic.type === "daily-course-limit") {
    return (
      isId(diagnostic.classId) &&
      isId(diagnostic.courseId) &&
      isId(diagnostic.day) &&
      isCount(diagnostic.excessSlots) &&
      isCount(diagnostic.configuredLimit)
    );
  }
  if (diagnostic.type === "aggregate") {
    return (
      ["assignment-shortage", "teacher-conflict", "class-conflict", "daily-course-limit"].includes(
        String(diagnostic.conflictType),
      ) && isCount(diagnostic.count)
    );
  }
  return false;
}

function parseConflictReport(value: string | null, schoolId: string | null) {
  if (!value || !schoolId) return null;
  try {
    const parsed = JSON.parse(value) as Partial<GeneratorConflictReportReference>;
    if (
      parsed.schoolId !== schoolId ||
      typeof parsed.reportedAt !== "string" ||
      Number.isNaN(new Date(parsed.reportedAt).getTime()) ||
      !Array.isArray(parsed.diagnostics) ||
      parsed.diagnostics.length === 0 ||
      !parsed.diagnostics.every(isScheduleDiagnostic)
    ) {
      return null;
    }
    return {
      schoolId,
      reportedAt: parsed.reportedAt,
      diagnostics: parsed.diagnostics,
    };
  } catch {
    return null;
  }
}

function publishChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window === "undefined") return () => listeners.delete(listener);
  const handleStorage = (event: StorageEvent) => {
    if (
      event.storageArea === window.sessionStorage &&
      (event.key?.startsWith(PREVIEW_STORAGE_PREFIX) ||
        event.key?.startsWith(CONFLICT_STORAGE_PREFIX))
    ) {
      listener();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function readGeneratorPreviewReference(userId: string, schoolId: string) {
  return parsePreviewReference(
    readStoredValue(storageKey(PREVIEW_STORAGE_PREFIX, userId, schoolId)),
    schoolId,
  );
}

export function saveGeneratorPreviewReference(
  userId: string,
  reference: GeneratorPreviewReference,
) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      storageKey(PREVIEW_STORAGE_PREFIX, userId, reference.schoolId),
      JSON.stringify(reference),
    );
    publishChange();
  } catch {
    // Candidate details remain available in React Query for the current mount.
  }
}

export function clearGeneratorPreviewReference(userId: string, schoolId: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(PREVIEW_STORAGE_PREFIX, userId, schoolId));
    publishChange();
  } catch {
    // A blocked session store should not prevent the user from dismissing the mounted preview.
  }
}

export function readGeneratorConflictReport(userId: string, schoolId: string) {
  return parseConflictReport(
    readStoredValue(storageKey(CONFLICT_STORAGE_PREFIX, userId, schoolId)),
    schoolId,
  );
}

export function saveGeneratorConflictReport(
  userId: string,
  reference: GeneratorConflictReportReference,
) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      storageKey(CONFLICT_STORAGE_PREFIX, userId, reference.schoolId),
      JSON.stringify(reference),
    );
    publishChange();
  } catch {
    // A blocked session store should not interrupt the current generation result.
  }
}

export function clearGeneratorConflictReport(userId: string, schoolId: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(CONFLICT_STORAGE_PREFIX, userId, schoolId));
    publishChange();
  } catch {
    // A blocked session store should not prevent dismissing the mounted report.
  }
}

export function clearAllGeneratorPreviewReferences() {
  if (typeof window === "undefined") return;
  try {
    const keys = Array.from({ length: window.sessionStorage.length }, (_, index) =>
      window.sessionStorage.key(index),
    ).filter(
      (key): key is string =>
        Boolean(key?.startsWith(PREVIEW_STORAGE_PREFIX)) ||
        Boolean(key?.startsWith(CONFLICT_STORAGE_PREFIX)),
    );
    keys.forEach((key) => window.sessionStorage.removeItem(key));
    publishChange();
  } catch {
    // Session cleanup must continue even when browser storage is unavailable.
  }
}

export function useGeneratorPreviewReference(userId: string | null, schoolId: string | null) {
  const key = userId && schoolId ? storageKey(PREVIEW_STORAGE_PREFIX, userId, schoolId) : null;
  const serialized = useSyncExternalStore(
    subscribe,
    () => readStoredValue(key),
    () => null,
  );
  const reference = useMemo(
    () => parsePreviewReference(serialized, schoolId),
    [schoolId, serialized],
  );
  const save = useCallback(
    (candidateId: string, generatedAt: string) => {
      if (!userId || !schoolId) return;
      saveGeneratorPreviewReference(userId, { schoolId, candidateId, generatedAt });
    },
    [schoolId, userId],
  );
  const clear = useCallback(() => {
    if (!userId || !schoolId) return;
    clearGeneratorPreviewReference(userId, schoolId);
  }, [schoolId, userId]);

  return { reference, save, clear };
}

export function useGeneratorConflictReport(userId: string | null, schoolId: string | null) {
  const key = userId && schoolId ? storageKey(CONFLICT_STORAGE_PREFIX, userId, schoolId) : null;
  const serialized = useSyncExternalStore(
    subscribe,
    () => readStoredValue(key),
    () => null,
  );
  const reference = useMemo(
    () => parseConflictReport(serialized, schoolId),
    [schoolId, serialized],
  );
  const save = useCallback(
    (diagnostics: ScheduleDiagnostic[]) => {
      if (!userId || !schoolId || diagnostics.length === 0) return;
      saveGeneratorConflictReport(userId, {
        schoolId,
        reportedAt: new Date().toISOString(),
        diagnostics,
      });
    },
    [schoolId, userId],
  );
  const clear = useCallback(() => {
    if (!userId || !schoolId) return;
    clearGeneratorConflictReport(userId, schoolId);
  }, [schoolId, userId]);

  return { reference, save, clear };
}

export function formatGeneratorPreviewTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "زمان تولید ثبت نشده";
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
