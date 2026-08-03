import { ApiError } from "@/lib/api/client";

export type TeacherField = "name" | "personnel_code" | "phone";
export type TeacherFieldErrors = Partial<Record<TeacherField, string>>;

export type TeacherSubmissionResult =
  | { ok: true }
  | { ok: false; fieldErrors: TeacherFieldErrors; formError: string | null };

const backendFieldToFormField: Record<string, TeacherField | undefined> = {
  name: "name",
  code: "personnel_code",
  phone: "phone",
};

const conflictMessages = {
  name: "این نام قبلاً برای معلم دیگری ثبت شده است.",
  personnel_code: "کد پرسنلی وارد شده قبلاً برای معلم دیگری ثبت شده است.",
  phone: "شماره تلفن وارد شده قبلاً برای معلم دیگری ثبت شده است.",
  generic: "اطلاعات وارد شده با اطلاعات موجود تداخل دارد.",
} as const;

const validationMessages: Record<TeacherField, string> = {
  name: "نام معلم وارد شده معتبر نیست.",
  personnel_code: "کد پرسنلی وارد شده معتبر نیست.",
  phone: "شماره تلفن باید شامل ۷ تا ۲۰ رقم باشد.",
};

function getConflictText(error: ApiError): string {
  const details = error.details;
  let serializedDetails = "";
  try {
    serializedDetails = JSON.stringify(details ?? "");
  } catch {
    // Error details are used only for classification and are never shown to users.
  }
  return `${error.message} ${serializedDetails}`.toLocaleLowerCase("en-US");
}

function detectConflictField(error: ApiError): TeacherField | null {
  const text = getConflictText(error);
  const hasToken = (token: string) => new RegExp(`(^|[^a-z])${token}([^a-z]|$)`, "i").test(text);
  const mentionsPersonnelCode =
    [/personnel[_\s-]?code/, /teacher[_\s-]+code/, /teachers?[^a-z0-9]+code/].some((pattern) =>
      pattern.test(text),
    ) || hasToken("code");
  const mentionsPhone =
    [/phone[_\s-]?number/, /teacher[_\s-]+phone/, /teachers?[^a-z0-9]+phone/].some((pattern) =>
      pattern.test(text),
    ) || hasToken("phone");
  const mentionsName =
    [/teacher[_\s-]+name/, /teachers?[^a-z0-9]+name/].some((pattern) => pattern.test(text)) ||
    hasToken("name");

  const matchedFields = [mentionsName, mentionsPersonnelCode, mentionsPhone].filter(Boolean).length;
  if (matchedFields !== 1) return null;
  if (mentionsPersonnelCode) return "personnel_code";
  if (mentionsPhone) return "phone";
  return mentionsName ? "name" : null;
}

export function getTeacherFieldErrors(error: unknown): TeacherFieldErrors {
  if (!(error instanceof ApiError)) return {};

  if (error.status === 422) {
    return error.validationIssues.reduce<TeacherFieldErrors>((result, issue) => {
      const backendField = issue.path.split(".").at(-1) ?? "";
      const field = backendFieldToFormField[backendField];
      if (field && !result[field]) result[field] = validationMessages[field];
      return result;
    }, {});
  }

  if (error.status === 409) {
    const field = detectConflictField(error);
    if (field) return { [field]: conflictMessages[field] };
  }

  return {};
}

export function getTeacherErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "عملیات معلم با خطا مواجه شد. دوباره تلاش کنید.";
  }
  if (error.status === 0) return "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.";
  if (error.status === 401) return "نشست کاربری منقضی شده است. دوباره وارد شوید.";
  if (error.status === 403) return "شما اجازه مدیریت معلمان این مدرسه را ندارید.";
  if (error.status === 404) return "معلم موردنظر در این مدرسه پیدا نشد.";
  if (error.status === 409) {
    const field = detectConflictField(error);
    return field ? conflictMessages[field] : conflictMessages.generic;
  }
  if (error.status === 422) return "اطلاعات واردشده معتبر نیست.";
  if (error.status === 429) {
    return error.retryAfterSeconds
      ? `تعداد درخواست‌ها بیش از حد مجاز است. ${error.retryAfterSeconds} ثانیه دیگر تلاش کنید.`
      : "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد تلاش کنید.";
  }
  return "خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.";
}

export async function submitTeacherDetails(
  submit: () => Promise<void>,
): Promise<TeacherSubmissionResult> {
  try {
    await submit();
    return { ok: true };
  } catch (error) {
    const fieldErrors = getTeacherFieldErrors(error);
    return {
      ok: false,
      fieldErrors,
      formError: Object.keys(fieldErrors).length === 0 ? getTeacherErrorMessage(error) : null,
    };
  }
}
