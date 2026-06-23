import type { Teacher, Class, Subject, TimeSlot, Activity, Alert } from './types'

export const mockTeachers: Teacher[] = [
  {
    id: '1',
    name: 'سارا احمدی',
    email: 'sara.ahmadi@school.edu',
    phone: '۰۲۱-۱۲۳۴۵۶۷',
    subjects: ['ریاضی', 'فیزیک'],
    status: 'active',
  },
  {
    id: '2',
    name: 'محمد رضایی',
    email: 'mohammad.rezaei@school.edu',
    phone: '۰۲۱-۲۳۴۵۶۷۸',
    subjects: ['زبان انگلیسی', 'ادبیات'],
    status: 'active',
  },
  {
    id: '3',
    name: 'الناز حسینی',
    email: 'elnaz.hosseini@school.edu',
    phone: '۰۲۱-۳۴۵۶۷۸۹',
    subjects: ['شیمی', 'زیست‌شناسی'],
    status: 'active',
  },
  {
    id: '4',
    name: 'داوود کریمی',
    email: 'davood.karimi@school.edu',
    phone: '۰۲۱-۴۵۶۷۸۹۰',
    subjects: ['تاریخ', 'جغرافیا'],
    status: 'inactive',
  },
  {
    id: '5',
    name: 'نسیم محمدی',
    email: 'nasim.mohammadi@school.edu',
    phone: '۰۲۱-۵۶۷۸۹۰۱',
    subjects: ['هنر', 'موسیقی'],
    status: 'active',
  },
]

export const mockClasses: Class[] = [
  { id: '1', name: 'کلاس ۱۰-الف', grade: '10', section: 'الف', studentCount: 32, classTeacher: 'سارا احمدی' },
  { id: '2', name: 'کلاس ۱۰-ب', grade: '10', section: 'ب', studentCount: 30, classTeacher: 'محمد رضایی' },
  { id: '3', name: 'کلاس ۹-الف', grade: '9', section: 'الف', studentCount: 28, classTeacher: 'الناز حسینی' },
  { id: '4', name: 'کلاس ۹-ب', grade: '9', section: 'ب', studentCount: 31, classTeacher: 'داوود کریمی' },
  { id: '5', name: 'کلاس ۸-الف', grade: '8', section: 'الف', studentCount: 29, classTeacher: 'نسیم محمدی' },
  { id: '6', name: 'کلاس ۸-ب', grade: '8', section: 'ب', studentCount: 27, classTeacher: 'سارا احمدی' },
]

export const mockSubjects: Subject[] = [
  { id: '1', name: 'ریاضی', code: 'MATH', weeklyHours: 6, assignedTeacher: 'سارا احمدی', color: '#1E40AF' },
  { id: '2', name: 'زبان انگلیسی', code: 'ENG', weeklyHours: 5, assignedTeacher: 'محمد رضایی', color: '#059669' },
  { id: '3', name: 'فیزیک', code: 'PHY', weeklyHours: 4, assignedTeacher: 'سارا احمدی', color: '#7C3AED' },
  { id: '4', name: 'شیمی', code: 'CHEM', weeklyHours: 4, assignedTeacher: 'الناز حسینی', color: '#DC2626' },
  { id: '5', name: 'زیست‌شناسی', code: 'BIO', weeklyHours: 3, assignedTeacher: 'الناز حسینی', color: '#16A34A' },
  { id: '6', name: 'تاریخ', code: 'HIST', weeklyHours: 3, assignedTeacher: 'داوود کریمی', color: '#CA8A04' },
  { id: '7', name: 'جغرافیا', code: 'GEO', weeklyHours: 2, assignedTeacher: 'داوود کریمی', color: '#0891B2' },
  { id: '8', name: 'هنر', code: 'ART', weeklyHours: 2, assignedTeacher: 'نسیم محمدی', color: '#DB2777' },
]

export const mockTimeSlots: TimeSlot[] = [
  { id: '1', startTime: '08:00', endTime: '08:45', label: '۸:۰۰ - ۸:۴۵' },
  { id: '2', startTime: '08:50', endTime: '09:35', label: '۸:۵۰ - ۹:۳۵' },
  { id: '3', startTime: '09:40', endTime: '10:25', label: '۹:۴۰ - ۱۰:۲۵' },
  { id: '4', startTime: '10:40', endTime: '11:25', label: '۱۰:۴۰ - ۱۱:۲۵' },
  { id: '5', startTime: '11:30', endTime: '12:15', label: '۱۱:۳۰ - ۱۲:۱۵' },
  { id: '6', startTime: '13:00', endTime: '13:45', label: '۱۳:۰۰ - ۱۳:۴۵' },
  { id: '7', startTime: '13:50', endTime: '14:35', label: '۱۳:۵۰ - ۱۴:۳۵' },
  { id: '8', startTime: '14:40', endTime: '15:25', label: '۱۴:۴۰ - ۱۵:۲۵' },
]

export const mockActivities: Activity[] = [
  { id: '1', action: 'برنامه تولید شد', description: 'برنامه هفتگی پایه ۱۰ تولید شد', timestamp: new Date(Date.now() - 1000 * 60 * 30), user: 'مدیر' },
  { id: '2', action: 'معلم اضافه شد', description: 'معلم جدید نسیم محمدی اضافه شد', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), user: 'مدیر' },
  { id: '3', action: 'کلاس به‌روز شد', description: 'تعداد دانش‌آموزان کلاس ۹-الف به‌روز شد', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), user: 'مدیر' },
  { id: '4', action: 'درس ویرایش شد', description: 'ساعت هفتگی ریاضی به ۶ تغییر کرد', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), user: 'مدیر' },
]

export const mockAlerts: Alert[] = [
  { id: '1', type: 'warning', message: 'تداخل برنامه در شنبه ساعت ۱۰:۰۰ شناسایی شد', timestamp: new Date() },
  { id: '2', type: 'info', message: 'ترم جدید ۵ روز دیگر شروع می‌شود', timestamp: new Date() },
  { id: '3', type: 'success', message: 'تمام برنامه‌های پایه ۹ تکمیل شده است', timestamp: new Date() },
]

export const weekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه']

export const generateMockSchedule = () => {
  const schedule: Record<string, Record<string, { subject: Subject; teacher: string } | null>> = {}

  weekDays.forEach(day => {
    schedule[day] = {}
    mockTimeSlots.forEach((slot) => {
      if (Math.random() > 0.2) {
        const randomSubject = mockSubjects[Math.floor(Math.random() * mockSubjects.length)]
        schedule[day][slot.id] = {
          subject: randomSubject,
          teacher: randomSubject.assignedTeacher,
        }
      } else {
        schedule[day][slot.id] = null
      }
    })
  })

  return schedule
}
