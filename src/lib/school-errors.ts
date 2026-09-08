import { ApiError } from "@/lib/api/client";

export function getSchoolDeleteErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "حذف مدرسه انجام نشد.";

  const messages: Record<number, string> = {
    0: "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.",
    400: "درخواست حذف مدرسه معتبر نیست.",
    401: "برای حذف مدرسه، دوباره وارد حساب کاربری شوید.",
    403: "اجازه حذف این مدرسه را ندارید.",
    404: "مدرسه پیدا نشد یا قبلاً حذف شده است.",
    409: "حذف مدرسه با وضعیت فعلی اطلاعات امکان‌پذیر نیست.",
    422: "درخواست حذف مدرسه معتبر نیست.",
    429: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.",
  };

  return messages[error.status] ?? "حذف مدرسه انجام نشد.";
}
