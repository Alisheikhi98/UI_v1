import type {
  ClassAssignmentCreateOperation,
  ClassAssignmentUpdateOperation,
} from "./class-assignment-reconciliation.ts";
import { toApiId } from "./mappers.ts";

export function classAssignmentsPath(schoolId: string | number, classId: string): string {
  const numericSchoolId = typeof schoolId === "number" ? schoolId : toApiId(schoolId, "schoolId");
  return `/schools/${numericSchoolId}/classes/${toApiId(classId, "classId")}/assignments`;
}

export function classAssignmentPath(
  schoolId: string | number,
  classId: string,
  assignmentId: string,
): string {
  return `${classAssignmentsPath(schoolId, classId)}/${toApiId(assignmentId, "assignmentId")}`;
}

export function mapAssignmentCreatePayload(input: ClassAssignmentCreateOperation) {
  return {
    course_id: toApiId(input.courseId, "courseId"),
    teacher_id: toApiId(input.teacherId, "teacherId"),
    slots_per_week: input.weeklyPeriods,
  };
}

export function mapAssignmentUpdatePayload(input: ClassAssignmentUpdateOperation) {
  return {
    teacher_id: toApiId(input.teacherId, "teacherId"),
    slots_per_week: input.weeklyPeriods,
  };
}
