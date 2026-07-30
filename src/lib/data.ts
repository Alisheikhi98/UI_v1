import type { Alert, Activity, Course, Teacher, TimeSlot } from "./types";

export const mockTimeSlots: TimeSlot[] = [
  { id: "1", startTime: "08:00", endTime: "08:45", label: "۸:۰۰ - ۸:۴۵" },
  { id: "2", startTime: "08:50", endTime: "09:35", label: "۸:۵۰ - ۹:۳۵" },
  { id: "3", startTime: "09:40", endTime: "10:25", label: "۹:۴۰ - ۱۰:۲۵" },
  { id: "4", startTime: "10:40", endTime: "11:25", label: "۱۰:۴۰ - ۱۱:۲۵" },
  { id: "5", startTime: "11:30", endTime: "12:15", label: "۱۱:۳۰ - ۱۲:۱۵" },
  { id: "6", startTime: "13:00", endTime: "13:45", label: "۱۳:۰۰ - ۱۳:۴۵" },
  { id: "7", startTime: "13:50", endTime: "14:35", label: "۱۳:۵۰ - ۱۴:۳۵" },
  { id: "8", startTime: "14:40", endTime: "15:25", label: "۱۴:۴۰ - ۱۵:۲۵" },
];

export const mockActivities: Activity[] = [
  {
    id: "1",
    action: "برنامه تولید شد",
    description: "برنامه هفتگی پایه ۱۰ تولید شد",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    user: "مدیر",
  },
  {
    id: "2",
    action: "معلم اضافه شد",
    description: "معلم جدید نسیم محمدی اضافه شد",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    user: "مدیر",
  },
  {
    id: "3",
    action: "کلاس به‌روز شد",
    description: "تعداد دانش‌آموزان کلاس ۹-الف به‌روز شد",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    user: "مدیر",
  },
  {
    id: "4",
    action: "درس ویرایش شد",
    description: "ساعت هفتگی ریاضی به ۶ تغییر کرد",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    user: "مدیر",
  },
];

export const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "warning",
    message: "تداخل برنامه در شنبه ساعت ۱۰:۰۰ شناسایی شد",
    timestamp: new Date(),
  },
  { id: "2", type: "info", message: "ترم جدید ۵ روز دیگر شروع می‌شود", timestamp: new Date() },
  {
    id: "3",
    type: "success",
    message: "تمام برنامه‌های پایه ۹ تکمیل شده است",
    timestamp: new Date(),
  },
];

export const weekDays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه"];

export const generateMockSchedule = (courses: Course[], teachers: Teacher[]) => {
  const schedule: Record<string, Record<string, { subject: Course; teacher: string } | null>> = {};

  weekDays.forEach((day) => {
    schedule[day] = {};
    mockTimeSlots.forEach((slot) => {
      if (Math.random() > 0.2) {
        const randomSubject = courses[Math.floor(Math.random() * courses.length)];
        schedule[day][slot.id] = {
          subject: randomSubject,
          teacher:
            teachers.find((teacher) => teacher.id === randomSubject.assignedTeacherId)?.name ?? "",
        };
      } else {
        schedule[day][slot.id] = null;
      }
    });
  });

  return schedule;
};
