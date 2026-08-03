import { ApiError } from "@/lib/api/client";

export type TeacherField = "name" | "personnel_code" | "phone";
export type TeacherFieldErrors = Partial<Record<TeacherField, string>>;

const backendFieldToFormField: Record<string, TeacherField | undefined> = {
  name: "name",
  code: "personnel_code",
  phone: "phone",
};

export function getTeacherFieldErrors(error: unknown): TeacherFieldErrors {
  if (!(error instanceof ApiError)) return {};

  if (error.status === 422) {
    return error.validationIssues.reduce<TeacherFieldErrors>((result, issue) => {
      const backendField = issue.path.split(".").at(-1) ?? "";
      const field = backendFieldToFormField[backendField];
      if (field && !result[field]) result[field] = issue.message;
      return result;
    }, {});
  }

  if (error.status === 409) {
    const message = error.message.toLocaleLowerCase("en-US");
    if (message.includes("name")) return { name: "این نام قبلاً برای معلم دیگری ثبت شده است." };
    if (message.includes("code")) {
      return { personnel_code: "این کد پرسنلی قبلاً ثبت شده است." };
    }
    if (message.includes("phone")) return { phone: "این شماره تماس قبلاً ثبت شده است." };
  }

  return {};
}

export function getTeacherErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : "عملیات معلم انجام نشد.";
  }
  if (error.status === 0) return "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.";
  if (error.status === 401) return "نشست کاربری منقضی شده است. دوباره وارد شوید.";
  if (error.status === 403) return "شما اجازه مدیریت معلمان این مدرسه را ندارید.";
  if (error.status === 404) return "معلم موردنظر در این مدرسه پیدا نشد.";
  if (error.status === 409) return error.message;
  if (error.status === 422) return "اطلاعات واردشده معتبر نیست.";
  if (error.status === 429) {
    return error.retryAfterSeconds
      ? `تعداد درخواست‌ها بیش از حد مجاز است. ${error.retryAfterSeconds} ثانیه دیگر تلاش کنید.`
      : "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد تلاش کنید.";
  }
  return error.message;
}
