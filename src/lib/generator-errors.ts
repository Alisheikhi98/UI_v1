import { ApiError } from "@/lib/api/client";

function responseField(error: ApiError, field: string) {
  if (!error.details || typeof error.details !== "object") return undefined;
  return (error.details as Record<string, unknown>)[field];
}

export function getGeneratorErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.";
  }
  if (error.status === 0) return "ارتباط با سرور برقرار نشد.";
  if (error.status === 429) {
    const detail = responseField(error, "detail");
    if (detail === "Another scheduling operation is already running.") {
      return "یک عملیات تولید برنامه برای این مدرسه در حال اجراست. پس از پایان آن دوباره تلاش کنید.";
    }
    if (error.retryAfterSeconds) {
      return `تعداد درخواست‌های تولید برنامه بیش از حد مجاز است. ${error.retryAfterSeconds.toLocaleString("fa-IR")} ثانیه دیگر دوباره تلاش کنید.`;
    }
    return "تعداد درخواست‌های تولید برنامه بیش از حد مجاز است. پس از پایان محدودیت دوباره تلاش کنید.";
  }
  if (error.status === 422) {
    const code = responseField(error, "code");
    const schedulerMessages: Record<string, string> = {
      SCHEDULER_ASSIGNMENTS_NOT_FOUND:
        "برای تولید برنامه، ابتدا درس‌ها و معلمان کلاس‌ها را کامل کنید.",
      SCHEDULER_CALENDAR_NOT_FOUND:
        "روزها و زنگ‌های مدرسه کامل نیست. ابتدا تنظیمات زمانی مدرسه را تکمیل کنید.",
      SCHEDULER_AVAILABILITY_NOT_FOUND:
        "زمان حضور معلمان ثبت نشده است. ابتدا زمان‌های حضور را تکمیل کنید.",
      INSUFFICIENT_TEACHER_AVAILABILITY:
        "زمان حضور بعضی معلمان برای زنگ‌های هفتگی آن‌ها کافی نیست.",
    };
    if (typeof code === "string" && schedulerMessages[code]) return schedulerMessages[code];
    return "اطلاعات موردنیاز زمان‌بندی کامل نیست.";
  }
  const statusMessages: Record<number, string> = {
    400: "اطلاعات لازم برای تولید برنامه معتبر نیست.",
    401: "نشست شما پایان یافته است. دوباره وارد شوید.",
    403: "اجازه تولید برنامه برای این مدرسه را ندارید.",
    404: "اطلاعات مدرسه یا برنامه پیدا نشد.",
    409: "اطلاعات برنامه با تغییرات فعلی مدرسه سازگار نیست.",
    504: "زمان جست‌وجوی برنامه پایان یافت. دوباره تلاش کنید.",
  };
  return statusMessages[error.status] ?? "تولید برنامه با خطا مواجه شد.";
}
