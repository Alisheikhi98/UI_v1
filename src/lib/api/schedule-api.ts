import { apiRequest } from "@/lib/api/client";
import type {
  ClassScheduleDto,
  ScheduleCandidateDetailDto,
  ScheduleCandidateResultDto,
  ScheduleCandidateSummaryDto,
  ScheduleConfirmationDto,
  ScheduleRequestDto,
  ScheduleResultDto,
  ScheduledLessonDto,
} from "@/lib/api/dtos";
import type {
  ScheduleCandidateDetail,
  ScheduleCandidateSummary,
  ScheduleConfirmation,
  ScheduleGenerationResult,
  ScheduleGenerationSettings,
  ScheduleRepairResult,
  PublishedClassSchedule,
  ScheduledLesson,
} from "@/lib/scheduler";
import { parseScheduleDiagnostics } from "@/lib/schedule-diagnostics";

const toApiId = (value: string, label: string) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`${label} must be a positive integer.`);
  return id;
};

const mapLesson = (lesson: ScheduledLessonDto): ScheduledLesson => ({
  assignmentId: String(lesson.assignment_id),
  daySlotId: String(lesson.day_slot_id),
  teacherId: String(lesson.teacher_id),
  classId: String(lesson.class_id),
  courseId: String(lesson.course_id),
  day: lesson.day,
  slot: lesson.slot,
});

const mapCandidateSummary = (candidate: ScheduleCandidateSummaryDto): ScheduleCandidateSummary => ({
  id: String(candidate.candidate_id),
  status: candidate.status,
  totalGap: candidate.total_gap,
  selected: candidate.selected,
  createdAt: candidate.created_at,
});

const mapSummary = (candidate: ScheduleCandidateDetailDto): ScheduleCandidateDetail => ({
  ...mapCandidateSummary(candidate),
  lessons: candidate.lessons.map(mapLesson),
});

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

const mapRepairResult = (result: ScheduleResultDto): ScheduleRepairResult => {
  const details = result.details;
  const rawAdditions = Array.isArray(details.proposed_availability_additions)
    ? details.proposed_availability_additions
    : [];
  const proposedAvailabilityAdditions = rawAdditions.flatMap((addition) => {
    if (!addition || typeof addition !== "object") return [];
    const item = addition as Record<string, unknown>;
    if (
      !isPositiveInteger(item.teacher_id) ||
      !isPositiveInteger(item.day_slot_id) ||
      typeof item.day !== "string" ||
      !isPositiveInteger(item.slot)
    )
      return [];
    return [
      {
        teacherId: String(item.teacher_id),
        daySlotId: String(item.day_slot_id),
        day: item.day,
        slot: item.slot,
      },
    ];
  });

  return {
    success: result.success,
    status: result.status,
    code: result.code,
    totalGap: result.total_gap,
    lessons: result.lessons.map(mapLesson),
    repairType:
      details.repair_type === "teacher_availability_additions"
        ? "teacher_availability_additions"
        : null,
    minimumChanges:
      typeof details.minimum_changes === "number" &&
      Number.isSafeInteger(details.minimum_changes) &&
      details.minimum_changes >= 0
        ? details.minimum_changes
        : null,
    minimumChangesProven:
      typeof details.minimum_changes_proven === "boolean" ? details.minimum_changes_proven : null,
    proposedAvailabilityAdditions,
  };
};

export interface ScheduleApi {
  generate(
    schoolId: string,
    settings: ScheduleGenerationSettings,
    options?: { signal?: AbortSignal },
  ): Promise<ScheduleGenerationResult>;
  repairAvailability(
    schoolId: string,
    settings: ScheduleGenerationSettings,
    options?: { signal?: AbortSignal },
  ): Promise<ScheduleRepairResult>;
  getCandidate(
    schoolId: string,
    candidateId: string,
    options?: { signal?: AbortSignal },
  ): Promise<ScheduleCandidateDetail>;
  listCandidates(
    schoolId: string,
    options?: { signal?: AbortSignal },
  ): Promise<ScheduleCandidateSummary[]>;
  confirmCandidate(
    schoolId: string,
    candidateId: string,
    options?: { signal?: AbortSignal },
  ): Promise<ScheduleConfirmation>;
  getClassSchedule(
    schoolId: string,
    classId: string,
    options?: { signal?: AbortSignal },
  ): Promise<PublishedClassSchedule>;
}

export const scheduleApi: ScheduleApi = {
  async generate(schoolId, settings, options) {
    const request: ScheduleRequestDto = {
      minimize_gaps: settings.minimizeGaps,
      max_same_course_slots_per_day: settings.maxSameCourseSlotsPerDay,
    };
    const result = await apiRequest<ScheduleCandidateResultDto>(
      `/schedule/${toApiId(schoolId, "schoolId")}`,
      {
        method: "POST",
        signal: options?.signal,
        body: JSON.stringify(request),
      },
    );
    return {
      success: result.success,
      status: result.status,
      code: result.code,
      candidateId: result.candidate_id === null ? null : String(result.candidate_id),
      totalGap: result.total_gap,
      lessons: result.lessons.map(mapLesson),
      diagnostics: parseScheduleDiagnostics(result.status, result.message, result.details),
    };
  },

  async repairAvailability(schoolId, settings, options) {
    const request: ScheduleRequestDto = {
      minimize_gaps: settings.minimizeGaps,
      max_same_course_slots_per_day: settings.maxSameCourseSlotsPerDay,
    };
    const result = await apiRequest<ScheduleResultDto>(
      `/schedule/${toApiId(schoolId, "schoolId")}/repair-availability`,
      {
        method: "POST",
        signal: options?.signal,
        body: JSON.stringify(request),
      },
    );
    return mapRepairResult(result);
  },

  async getCandidate(schoolId, candidateId, options) {
    const row = await apiRequest<ScheduleCandidateDetailDto>(
      `/schedule/${toApiId(schoolId, "schoolId")}/candidates/${toApiId(candidateId, "candidateId")}`,
      { signal: options?.signal },
    );
    return mapSummary(row);
  },

  async listCandidates(schoolId, options) {
    const rows = await apiRequest<ScheduleCandidateSummaryDto[]>(
      `/schedule/${toApiId(schoolId, "schoolId")}/candidates`,
      { signal: options?.signal },
    );
    return rows.map(mapCandidateSummary);
  },

  async confirmCandidate(schoolId, candidateId, options) {
    const result = await apiRequest<ScheduleConfirmationDto>(
      `/schedule/${toApiId(schoolId, "schoolId")}/candidates/${toApiId(candidateId, "candidateId")}/confirm`,
      { method: "POST", signal: options?.signal },
    );
    return {
      candidateId: String(result.candidate_id),
      savedLessons: result.saved_lessons,
    };
  },

  async getClassSchedule(schoolId, classId, options) {
    const result = await apiRequest<ClassScheduleDto>(
      `/schools/${toApiId(schoolId, "schoolId")}/classes/${toApiId(classId, "classId")}/schedule`,
      { signal: options?.signal },
    );
    return {
      classId: String(result.class_id),
      className: result.class_name,
      items: result.items.map((item) => ({
        id: String(item.schedule_id),
        daySlotId: String(item.day_slot_id),
        dayId: String(item.day_id),
        dayName: item.day_name,
        slotNumber: item.slot_number,
        startTime: item.start_time,
        endTime: item.end_time,
        courseId: String(item.course_id),
        courseName: item.course_name,
        teacherId: item.teacher_id === null ? null : String(item.teacher_id),
        teacherName: item.teacher_name,
      })),
    };
  },
};
