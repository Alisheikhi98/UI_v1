export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  courseIds: string[];
  status: "active" | "inactive";
  avatar?: string;
  personnel_code?: string;
}

export type TeacherWithAvailability = Teacher & {
  availableDaySlotIds: string[];
};

export interface DaySlot {
  id: string;
  schoolId: string;
  dayId: number;
  slotNumber: number;
  title: string | null;
  startTime: string | null;
  endTime: string | null;
  active: boolean;
}

export interface DaySlotGroup {
  dayId: number;
  dayName: string;
  slots: DaySlot[];
}

export interface Class {
  id: string;
  name: string;
  gradeId: string;
  majorId: string;
  section?: string;
  studentCapacity: number;
  advisorTeacherId?: string;
}

export interface Major {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface Course {
  id: string;
  name: string;
  active: boolean;
  gradeId: string;
  majorId: string;
  category: "general" | "specialized";
  code: string;
  weeklyHours: number;
  assignedTeacherId?: string;
  color: string;
}

export interface ClassAssignment {
  id: string;
  classId: string;
  courseId: string;
  teacherId: string;
  weeklyPeriods: number;
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
}

export interface ScheduleEntry {
  id: string;
  day: string;
  timeSlot: TimeSlot;
  subject: Course;
  teacher: Teacher;
  class: Class;
}

export interface Activity {
  id: string;
  action: string;
  description: string;
  timestamp: Date;
  user: string;
}

export interface Alert {
  id: string;
  type: "warning" | "info" | "error" | "success";
  message: string;
  timestamp: Date;
}
