import { useEffect, useState, useCallback } from 'react'

/**
 * ساختار هر زنگ در برنامه زمانی
 */
export interface PeriodTime {
  index: number
  start: string
  end: string
}

/**
 * مدل ساده‌سازی شده مدرسه - متمرکز بر مدیریت زمان و هویت
 */
export interface School {
  id: string
  name: string
  slug: string
  status: 'active' | 'inactive'
  workingDays: string[]
  timing: {
    periodsCount: number
    dayStart: string // فرمت HH:mm
    classDuration: number // دقیقه
    breakDuration: number // دقیقه
  }
  periods: PeriodTime[]
  createdAt: number
}

const STORAGE_KEY = 'amoozeshyar:schools:v2' // تغییر ورژن برای جلوگیری از تداخل با داده‌های قدیمی
const ACTIVE_KEY = 'amoozeshyar:schools:active'

export const WEEK_DAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
]

export const DEFAULT_WORKING_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه']

/**
 * تابع کمکی برای محاسبه خودکار زمان شروع و پایان هر زنگ
 */
export function calculatePeriods(
  periodsCount: number,
  dayStart: string,
  classDuration: number,
  breakDuration: number
): PeriodTime[] {
  const [h, m] = dayStart.split(':').map(Number)
  let cursor = (h || 0) * 60 + (m || 0)
  const list: PeriodTime[] = []

  for (let i = 0; i < periodsCount; i++) {
    const start = cursor
    const end = start + classDuration
    list.push({
      index: i + 1,
      start: fmt(start),
      end: fmt(end),
    })
    cursor = end + breakDuration
  }
  return list
}

/**
 * تبدیل دقیقه به فرمت ساعت دیجیتال
 */
function fmt(mins: number) {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// توابع پایه عملیات فایل (LocalStorage)
function normalizeSchool(value: School): School {
  return {
    ...value,
    slug: typeof value.slug === 'string' ? value.slug : '',
  }
}

function read(): School[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as School[]).map(normalizeSchool) : []
  } catch {
    return []
  }
}

function write(list: School[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  window.dispatchEvent(new Event('schools:changed'))
}

/**
 * هوک مدیریت وضعیت مدارس
 */
export function useSchools() {
  const [schools, setSchools] = useState<School[]>([])
  const [activeId, setActiveIdState] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // همگام‌سازی وضعیت با LocalStorage
  useEffect(() => {
    setSchools(read())
    setActiveIdState(localStorage.getItem(ACTIVE_KEY))
    setHydrated(true)

    const onChange = () => {
      setSchools(read())
      setActiveIdState(localStorage.getItem(ACTIVE_KEY))
    }

    window.addEventListener('schools:changed', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('schools:changed', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  /**
   * ایجاد مدرسه جدید با محاسبه خودکار زنگ‌ها
   */
  const create = useCallback((data: Omit<School, 'id' | 'createdAt'>) => {
    const school: School = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      // اگر در فرم کاربر تغییر دستی نداده باشد، اینجا مجدد محاسبه می‌شود
      // اما معمولاً فرم خودش داده‌های نهایی را می‌فرستد
    }
    const list = [...read(), school]
    write(list)
    
    // اگر اولین مدرسه است، آن را به عنوان مدرسه فعال انتخاب کن
    if (!localStorage.getItem(ACTIVE_KEY)) {
      localStorage.setItem(ACTIVE_KEY, school.id)
    }
    return school
  }, [])

  /**
   * ویرایش اطلاعات مدرسه موجود
   */
  const update = useCallback((id: string, patch: Partial<Omit<School, 'id' | 'createdAt'>>) => {
    const list = read().map((s) => (s.id === id ? { ...s, ...patch } : s))
    write(list)
  }, [])

  /**
   * حذف مدرسه و مدیریت وضعیت فعال
   */
  const remove = useCallback((id: string) => {
    const list = read().filter((s) => s.id !== id)
    write(list)
    if (localStorage.getItem(ACTIVE_KEY) === id) {
      const next = list[0]?.id ?? null
      if (next) localStorage.setItem(ACTIVE_KEY, next)
      else localStorage.removeItem(ACTIVE_KEY)
    }
  }, [])

  const setActive = useCallback((id: string) => {
    localStorage.setItem(ACTIVE_KEY, id)
    window.dispatchEvent(new Event('schools:changed'))
  }, [])

  return { 
    schools, 
    activeId, 
    hydrated, 
    create, 
    update, 
    remove, 
    setActive 
  }
}
