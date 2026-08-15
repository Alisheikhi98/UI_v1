import { apiRequest } from "@/lib/api/client";
import type {
  ClassScheduleDto,
  ScheduleCandidateDetailDto,
  ScheduleConfirmationDto,
  ScheduleResultDto,
  ScheduledLessonDto,
} from "@/lib/api/dtos";
import type {
  ScheduleCandidateDetail,
  ScheduleConfirmation,
  ScheduleGenerationResult,
  PublishedClassSchedule,
  ScheduledLesson,
} from "@/lib/scheduler";

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

const mapSummary = (candidate: ScheduleCandidateDetailDto): ScheduleCandidateDetail => ({
  id: String(candidate.candidate_id),
  status: candidate.status,
  totalGap: candidate.total_gap,
  selected: candidate.selected,
  createdAt: candidate.created_at,
  lessons: candidate.lessons.map(mapLesson),
});

export interface ScheduleApi {
  generate(schoolId: string, options?: { signal?: AbortSignal }): Promise<ScheduleGenerationResult>;
  getCandidate(
    schoolId: string,
    candidateId: string,
    options?: { signal?: AbortSignal },
  ): Promise<ScheduleCandidateDetail>;
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
  async generate(schoolId, options) {
    const result = await apiRequest<ScheduleResultDto>(
      `/schedule/${toApiId(schoolId, "schoolId")}`,
      {
        method: "POST",
        signal: options?.signal,
        body: JSON.stringify({ minimize_gaps: true }),
      },
    );
    return {
      success: result.success,
      status: result.status,
      code: result.code,
      candidateId: result.candidate_id === null ? null : String(result.candidate_id),
      totalGap: result.total_gap,
      lessons: result.lessons.map(mapLesson),
    };
  },

  async getCandidate(schoolId, candidateId, options) {
    const row = await apiRequest<ScheduleCandidateDetailDto>(
      `/schedule/${toApiId(schoolId, "schoolId")}/candidates/${toApiId(candidateId, "candidateId")}`,
      { signal: options?.signal },
    );
    return mapSummary(row);
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
