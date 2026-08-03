import type { ClassAssignmentReplacementInput } from "@/lib/repositories";
import type { ClassAssignment } from "@/lib/types";

export type ClassAssignmentDraft = ClassAssignmentReplacementInput & {
  draftId: string;
};

export function initializeClassAssignmentDraft({
  classId,
  assignments,
  queryStatus,
  initializedClassId,
}: {
  classId: string;
  assignments: readonly ClassAssignment[];
  queryStatus: "pending" | "error" | "success";
  initializedClassId: string | null;
}): ClassAssignmentDraft[] | null {
  if (queryStatus !== "success" || initializedClassId === classId) return null;

  return assignments
    .filter((assignment) => assignment.classId === classId)
    .map((assignment) => ({
      ...structuredClone(assignment),
      draftId: assignment.id,
    }));
}

export function isAssignmentDraftRowDirty(
  assignment: ClassAssignmentDraft,
  initialDraft: readonly ClassAssignmentDraft[],
): boolean {
  const initial = initialDraft.find((item) => item.id && item.id === assignment.id);
  return (
    !initial ||
    initial.courseId !== assignment.courseId ||
    initial.teacherId !== assignment.teacherId ||
    initial.weeklyPeriods !== assignment.weeklyPeriods
  );
}

export function selectCreatedTeacherInDraft(
  draft: readonly ClassAssignmentDraft[],
  targetDraftId: string,
  teacherId: string,
): ClassAssignmentDraft[] {
  return draft.map((assignment) =>
    assignment.draftId === targetDraftId ? { ...assignment, teacherId } : assignment,
  );
}
