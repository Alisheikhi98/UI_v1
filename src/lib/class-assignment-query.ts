export function canLoadClassAssignments(
  useMockApi: boolean,
  schoolId: string | null,
  classIds: readonly string[],
): boolean {
  const nonEmptyClassIds =
    classIds.length > 0 && classIds.every((classId) => classId.trim().length > 0);
  if (!nonEmptyClassIds) return false;
  if (useMockApi) return true;

  const isPositiveBackendId = (value: string | null) => {
    if (value === null) return false;
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) && numeric > 0;
  };

  return isPositiveBackendId(schoolId) && classIds.every(isPositiveBackendId);
}
