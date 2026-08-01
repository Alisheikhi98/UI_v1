import type { ClassAssignmentReplacementInput, RepositoryRequestOptions } from "@/lib/repositories";
import type { ClassAssignment } from "@/lib/types";

export interface ClassAssignmentUpdateOperation {
  assignmentId: string;
  teacherId: string;
  weeklyPeriods: number;
}

export interface ClassAssignmentCreateOperation {
  courseId: string;
  teacherId: string;
  weeklyPeriods: number;
}

export interface ClassAssignmentReconciliationPlan {
  deletes: string[];
  updates: ClassAssignmentUpdateOperation[];
  creates: ClassAssignmentCreateOperation[];
}

export interface ClassAssignmentCrudOperations {
  load(classId: string, options?: RepositoryRequestOptions): Promise<ClassAssignment[]>;
  remove(classId: string, assignmentId: string, options?: RepositoryRequestOptions): Promise<void>;
  update(
    classId: string,
    operation: ClassAssignmentUpdateOperation,
    options?: RepositoryRequestOptions,
  ): Promise<void>;
  create(
    classId: string,
    operation: ClassAssignmentCreateOperation,
    options?: RepositoryRequestOptions,
  ): Promise<void>;
}

export class ClassAssignmentSaveInProgressError extends Error {
  constructor() {
    super("Class assignment changes are already being saved.");
    this.name = "ClassAssignmentSaveInProgressError";
  }
}

export class ClassAssignmentPartialFailureError extends Error {
  readonly serverAssignments: ClassAssignment[];
  readonly cause: unknown;
  readonly refetchError?: unknown;

  constructor(cause: unknown, serverAssignments: ClassAssignment[], refetchError?: unknown) {
    super(cause instanceof Error ? cause.message : "Class assignment saving failed.");
    this.name = "ClassAssignmentPartialFailureError";
    this.cause = cause;
    this.serverAssignments = serverAssignments;
    this.refetchError = refetchError;
  }
}

export class ClassAssignmentPersistenceVerificationError extends Error {
  constructor(message = "The final server response does not contain all saved assignments.") {
    super(message);
    this.name = "ClassAssignmentPersistenceVerificationError";
  }
}

export function isClassAssignmentPartialFailure(
  error: unknown,
): error is ClassAssignmentPartialFailureError {
  return error instanceof ClassAssignmentPartialFailureError;
}

function validateDraft(classId: string, assignments: readonly ClassAssignmentReplacementInput[]) {
  const courseIds = new Set<string>();
  assignments.forEach((assignment) => {
    if (assignment.classId !== classId) {
      throw new Error("Every assignment must belong to the selected class.");
    }
    if (!assignment.courseId || !assignment.teacherId) {
      throw new Error("Every assignment requires a course and teacher.");
    }
    if (
      !Number.isInteger(assignment.weeklyPeriods) ||
      assignment.weeklyPeriods <= 0 ||
      assignment.weeklyPeriods > 40
    ) {
      throw new Error("Weekly periods must be an integer between 1 and 40.");
    }
    if (courseIds.has(assignment.courseId)) {
      throw new Error("Duplicate courses are not allowed within the same class.");
    }
    courseIds.add(assignment.courseId);
  });
}

export function assertAssignmentsPersisted(
  classId: string,
  desired: readonly ClassAssignmentReplacementInput[],
  serverAssignments: readonly ClassAssignment[],
) {
  const serverByCourseId = new Map(
    serverAssignments
      .filter((assignment) => assignment.classId === classId)
      .map((assignment) => [assignment.courseId, assignment]),
  );

  const allPersisted =
    serverByCourseId.size === desired.length &&
    desired.every((assignment) => {
      const persisted = serverByCourseId.get(assignment.courseId);
      return (
        persisted !== undefined &&
        Boolean(persisted.id) &&
        persisted.teacherId === assignment.teacherId &&
        persisted.weeklyPeriods === assignment.weeklyPeriods
      );
    });

  if (!allPersisted) {
    throw new ClassAssignmentPersistenceVerificationError(
      "The final server response did not contain the requested class assignment rows.",
    );
  }
}

export function buildClassAssignmentReconciliationPlan(
  latest: readonly ClassAssignment[],
  desired: readonly ClassAssignmentReplacementInput[],
): ClassAssignmentReconciliationPlan {
  const latestById = new Map(latest.map((assignment) => [assignment.id, assignment]));
  const desiredByExistingId = new Map(
    desired.flatMap((assignment) =>
      assignment.id && latestById.has(assignment.id) ? [[assignment.id, assignment]] : [],
    ),
  );

  const deletes = latest
    .filter((assignment) => {
      const next = desiredByExistingId.get(assignment.id);
      return !next || next.courseId !== assignment.courseId;
    })
    .map((assignment) => assignment.id);

  const updates = latest.flatMap((assignment) => {
    const next = desiredByExistingId.get(assignment.id);
    if (
      !next ||
      next.courseId !== assignment.courseId ||
      (next.teacherId === assignment.teacherId && next.weeklyPeriods === assignment.weeklyPeriods)
    ) {
      return [];
    }
    return [
      {
        assignmentId: assignment.id,
        teacherId: next.teacherId,
        weeklyPeriods: next.weeklyPeriods,
      },
    ];
  });

  const creates = desired.flatMap((assignment) => {
    const current = assignment.id ? latestById.get(assignment.id) : undefined;
    if (current && current.courseId === assignment.courseId) return [];
    return [
      {
        courseId: assignment.courseId,
        teacherId: assignment.teacherId,
        weeklyPeriods: assignment.weeklyPeriods,
      },
    ];
  });

  return { deletes, updates, creates };
}

export class ClassAssignmentReconciler {
  private readonly pendingClassIds = new Set<string>();
  private readonly operations: ClassAssignmentCrudOperations;

  constructor(operations: ClassAssignmentCrudOperations) {
    this.operations = operations;
  }

  async replaceForClass(
    classId: string,
    assignments: readonly ClassAssignmentReplacementInput[],
    options?: RepositoryRequestOptions,
  ): Promise<ClassAssignment[]> {
    if (this.pendingClassIds.has(classId)) throw new ClassAssignmentSaveInProgressError();
    validateDraft(classId, assignments);
    this.pendingClassIds.add(classId);

    try {
      const latest = await this.operations.load(classId, options);
      const plan = buildClassAssignmentReconciliationPlan(latest, assignments);
      let mutationAttempted = false;

      try {
        for (const assignmentId of plan.deletes) {
          mutationAttempted = true;
          await this.operations.remove(classId, assignmentId, options);
        }
        for (const update of plan.updates) {
          mutationAttempted = true;
          await this.operations.update(classId, update, options);
        }
        for (const create of plan.creates) {
          mutationAttempted = true;
          await this.operations.create(classId, create, options);
        }

        const persistedAssignments = await this.operations.load(classId, options);
        assertAssignmentsPersisted(classId, assignments, persistedAssignments);
        return persistedAssignments;
      } catch (error) {
        if (!mutationAttempted) throw error;

        let serverAssignments: ClassAssignment[] = [];
        let refetchError: unknown;
        try {
          serverAssignments = await this.operations.load(classId);
        } catch (loadError) {
          refetchError = loadError;
        }
        throw new ClassAssignmentPartialFailureError(error, serverAssignments, refetchError);
      }
    } finally {
      this.pendingClassIds.delete(classId);
    }
  }
}
