export const repositoryQueryKeys = {
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
};
