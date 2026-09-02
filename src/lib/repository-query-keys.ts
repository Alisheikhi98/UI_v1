export const repositoryQueryKeys = {
  majors: () => ["majors"] as const,
  schools: () => ["schools"] as const,
  teachersRoot: (schoolId: string | null) => ["teachers", schoolId ?? "none"] as const,
  teachers: (schoolId: string | null, params?: unknown) =>
    ["teachers", schoolId ?? "none", params ?? {}] as const,
  teacherAvailability: (schoolId: string | null, teacherId: string) =>
    ["schools", schoolId ?? "none", "teachers", teacherId, "availability"] as const,
  teacherCourses: (schoolId: string | null, teacherId: string) =>
    ["schools", schoolId ?? "none", "teachers", teacherId, "courses"] as const,
  courses: (schoolId: string | null, classId?: string) =>
    [
      classId ? "class-compatible-courses" : "courses",
      schoolId ?? "none",
      classId ?? "all",
    ] as const,
  classes: (schoolId: string | null, params?: unknown) =>
    ["classes", schoolId ?? "none", params ?? {}] as const,
  assignments: (schoolId: string | null, classIds: readonly string[]) =>
    ["class-assignments", schoolId ?? "none", [...classIds].sort()] as const,
  assignmentsRoot: (schoolId: string | null) => ["class-assignments", schoolId ?? "none"] as const,
  daySlots: (schoolId: string | null) => ["schools", schoolId ?? "none", "day-slots"] as const,
  classUnavailableSlots: (schoolId: string | null, classId: string) =>
    ["schools", schoolId ?? "none", "classes", classId, "unavailable-slots"] as const,
  schoolStatistics: (schoolId: string | null) =>
    ["schools", schoolId ?? "none", "statistics"] as const,
  scheduleCandidates: (schoolId: string | null) =>
    ["schools", schoolId ?? "none", "schedule-candidates"] as const,
  scheduleCandidate: (schoolId: string | null, candidateId: string) =>
    ["schools", schoolId ?? "none", "schedule-candidates", candidateId] as const,
  scheduleAssignmentReferencesRoot: (schoolId: string | null) =>
    ["schools", schoolId ?? "none", "schedule-assignment-references"] as const,
  scheduleAssignmentReferences: (schoolId: string | null, classIds: readonly string[]) =>
    [
      ...repositoryQueryKeys.scheduleAssignmentReferencesRoot(schoolId),
      [...classIds].sort(),
    ] as const,
  finalTimetableRoot: (schoolId: string | null) =>
    ["schools", schoolId ?? "none", "final-timetable"] as const,
  publishedClassSchedule: (schoolId: string | null, classId: string) =>
    ["schools", schoolId ?? "none", "final-timetable", "class", classId] as const,
  finalTimetable: (schoolId: string | null, classIds: readonly string[]) =>
    ["schools", schoolId ?? "none", "final-timetable", [...classIds].sort()] as const,
};
