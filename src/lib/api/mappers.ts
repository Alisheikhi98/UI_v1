import type { Class, ClassAssignment, Course, DaySlot, Teacher } from "@/lib/types";
import type {
  ClassAssignmentDto,
  ClassDto,
  CourseDto,
  DaySlotDto,
  FastApiPage,
  TeacherDto,
} from "@/lib/api/dtos";
import type { PaginatedResult } from "@/lib/repositories";

export function toApiId(id: string, field: string): number {
  const numeric = Number(id.startsWith("major-") ? id.slice(6) : id);
  if (!Number.isSafeInteger(numeric) || numeric <= 0) {
    throw new Error(`${field} must be a positive backend ID.`);
  }
  return numeric;
}

export const mapPage = <TDto, TDomain>(
  page: FastApiPage<TDto>,
  mapper: (value: TDto) => TDomain,
): PaginatedResult<TDomain> => ({
  items: page.items.map(mapper),
  total: page.total,
  page: page.page,
  pageSize: page.size,
});

export const mapTeacher = (dto: TeacherDto): Teacher => ({
  id: String(dto.id),
  name: dto.name,
  email: "",
  phone: dto.phone ?? "",
  personnel_code: dto.code ?? "",
  courseIds: [],
  availableDaySlotIds: [],
  status: dto.active ? "active" : "inactive",
});

const courseColor = (id: number) => {
  const palette = ["#1E40AF", "#059669", "#7C3AED", "#DC2626", "#CA8A04", "#0891B2"];
  return palette[id % palette.length];
};

export const mapCourse = (dto: CourseDto): Course => ({
  id: String(dto.id),
  name: dto.name,
  active: dto.active,
  gradeId: String(dto.grade),
  majorId: `major-${dto.major_id}`,
  category: dto.category,
  code: dto.course_code ?? "",
  weeklyHours: 1,
  color: courseColor(dto.id),
});

export const mapClass = (dto: ClassDto): Class => ({
  id: String(dto.id),
  name: dto.name,
  gradeId: String(dto.grade),
  majorId: `major-${dto.major_id}`,
  studentCapacity: 0,
});

export const mapClassAssignment = (dto: ClassAssignmentDto): ClassAssignment => ({
  id: String(dto.id),
  classId: String(dto.class_id),
  courseId: String(dto.course_id),
  teacherId: String(dto.teacher_id),
  weeklyPeriods: dto.slots_per_week,
});

export const mapDaySlot = (dto: DaySlotDto): DaySlot => ({
  id: String(dto.id),
  schoolId: String(dto.school_id),
  dayId: dto.day_id,
  slotNumber: dto.slot_number,
  title: dto.title,
  startTime: dto.start_time?.slice(0, 5) ?? null,
  endTime: dto.end_time?.slice(0, 5) ?? null,
  active: dto.active,
});
