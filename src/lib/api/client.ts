export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  if (!baseUrl) {
    throw new ApiError('متغیر VITE_API_BASE_URL تنظیم نشده است.', 0)
  }
  return baseUrl.replace(/\/$/, '')
}

function getAccessToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

function getErrorMessage(body: unknown, status: number) {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail?: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          item && typeof item === 'object' && 'msg' in item
            ? String((item as { msg: unknown }).msg)
            : String(item)
        )
        .join('، ')
    }
  }
  return `درخواست با خطای ${status} مواجه شد.`
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  if (!token) {
    throw new ApiError('برای ادامه، ابتدا وارد حساب کاربری شوید.', 401)
  }

  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers })
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : 'ارتباط با سرور برقرار نشد.',
      0,
      error
    )
  }

  const contentType = response.headers.get('content-type') ?? ''
  const body = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    throw new ApiError(getErrorMessage(body, response.status), response.status, body)
  }

  return body as T
}
