export interface FastApiPage<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  pages: number;
}

export interface SchoolDto {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DaySlotDto {
  id: number;
  school_id: number;
  day_id: number;
  slot_number: number;
  title: string | null;
  start_time: string | null;
  end_time: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklyDaySlotsDto {
  days: Array<{
    day_id: number;
    day_name: string;
    slots: DaySlotDto[];
  }>;
}

export interface TeacherDto {
  id: number;
  school_id: number;
  name: string;
  code: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeacherAvailabilityDto {
  id: number;
  school_id: number;
  teacher_id: number;
  day_slot_id: number;
  availability_type: "available";
  created_at: string;
  updated_at: string;
}

export interface CourseDto {
  id: number;
  school_id: number | null;
  name: string;
  major_id: number;
  grade: number;
  category: "general" | "specialized";
  active: boolean;
  course_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface MajorDto {
  id: number;
  code: string;
  name: string;
  active: boolean;
}

export interface CourseCreateDto {
  name: string;
  major_id: number;
  grade: number;
  category: "general" | "specialized";
}

export interface TeacherCourseGroupDto {
  subject_code: string | null;
  display_name: string;
  grades: number[];
  major_ids: number[];
  courses: CourseDto[];
}

export interface ClassDto {
  id: number;
  school_id: number;
  major_id: number;
  name: string;
  grade: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassAssignmentDto {
  id: number;
  school_id: number;
  class_id: number;
  course_id: number;
  course_name: string;
  teacher_id: number;
  teacher_name: string;
  slots_per_week: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeleteCheckDto {
  can_delete?: boolean;
  has_dependencies?: boolean;
  requires_confirmation?: boolean;
  message?: string | null;
}

export interface ScheduledLessonDto {
  assignment_id: number;
  day_slot_id: number;
  teacher_id: number;
  class_id: number;
  course_id: number;
  day: string;
  slot: number;
}

export interface ScheduleResultDto {
  success: boolean;
  status: string;
  code: string;
  message: string;
  lessons: ScheduledLessonDto[];
  total_gap: number;
  details: Record<string, unknown>;
  candidate_id: number | null;
}

export interface ScheduleCandidateSummaryDto {
  candidate_id: number;
  status: string;
  total_gap: number;
  selected: boolean;
  created_at: string;
}

export interface ScheduleCandidateDetailDto extends ScheduleCandidateSummaryDto {
  lessons: ScheduledLessonDto[];
}

export interface ScheduleConfirmationDto {
  success: boolean;
  candidate_id: number;
  saved_lessons: number;
  message: string;
}

export interface ClassScheduleItemDto {
  schedule_id: number;
  day_slot_id: number;
  day_id: number;
  day_name: string;
  slot_number: number;
  start_time: string | null;
  end_time: string | null;
  course_id: number;
  course_name: string;
  teacher_id: number | null;
  teacher_name: string | null;
}

export interface ClassScheduleDto {
  class_id: number;
  class_name: string;
  items: ClassScheduleItemDto[];
}
