// src/lib/api/teachers.ts

// منطبق با TeacherBase و TeacherResponse
export type Teacher = {
  id: string | number
  name: string
  code: string
  phone: string
  active: boolean
  school_id?: string | number
  created_at?: string
  updated_at?: string
}

// منطبق با TeacherCreate/Update
export type TeacherPayload = {
  name: string
  code: string
  phone: string
  active?: boolean
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
// فرض بر این است که روت‌ها در prefix اصلی هستند، اگر نیستند این را تغییر بده
const TEACHERS_ENDPOINT = `${API_BASE_URL}/teachers` 

function getAuthHeaders() {
  const token = localStorage.getItem('token') // یا هر کلیدی که برای auth استفاده می‌کنی
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// دریافت لیست (List)
export async function getTeachers(): Promise<Teacher[]> {
  const response = await fetch(TEACHERS_ENDPOINT, {
    method: 'GET',
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('خطا در دریافت لیست معلمان')
  return response.json()
}

// ایجاد (Create)
export async function createTeacher(payload: TeacherPayload): Promise<Teacher> {
  const response = await fetch(TEACHERS_ENDPOINT, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload), // ارسال مستقیم طبق TeacherCreate
  })
  if (!response.ok) throw new Error('خطا در ایجاد معلم')
  return response.json()
}

// ویرایش (Update)
export async function updateTeacher(id: string | number, payload: TeacherPayload): Promise<Teacher> {
  const response = await fetch(`${TEACHERS_ENDPOINT}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload), // ارسال مستقیم طبق TeacherUpdate
  })
  if (!response.ok) throw new Error('خطا در به‌روزرسانی معلم')
  return response.json()
}

// حذف (Delete)
export async function deleteTeacher(id: string | number): Promise<void> {
  const response = await fetch(`${TEACHERS_ENDPOINT}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('خطا در حذف معلم')
}
