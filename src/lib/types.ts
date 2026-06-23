export interface Teacher {
  id: string
  name: string
  email: string
  phone: string
  subjects: string[]
  status: 'active' | 'inactive'
  avatar?: string
}

export interface Class {
  id: string
  name: string
  grade: string
  section: string
  studentCount: number
  classTeacher: string
}

export interface Subject {
  id: string
  name: string
  code: string
  weeklyHours: number
  assignedTeacher: string
  color: string
}

export interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  label: string
}

export interface ScheduleEntry {
  id: string
  day: string
  timeSlot: TimeSlot
  subject: Subject
  teacher: Teacher
  class: Class
}

export interface Activity {
  id: string
  action: string
  description: string
  timestamp: Date
  user: string
}

export interface Alert {
  id: string
  type: 'warning' | 'info' | 'error' | 'success'
  message: string
  timestamp: Date
}
