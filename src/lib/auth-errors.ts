import { ApiError } from "@/lib/api/client";

export type AuthField = "username" | "full_name" | "phone_number" | "email" | "password";
export type AuthFieldErrors = Partial<Record<AuthField, string>>;

const authFields = new Set<AuthField>([
  "username",
  "full_name",
  "phone_number",
  "email",
  "password",
]);

export function getAuthFieldErrors(error: unknown): AuthFieldErrors {
  if (!(error instanceof ApiError) || error.status !== 422) return {};
  return error.validationIssues.reduce<AuthFieldErrors>((result, issue) => {
    const field = issue.path.split(".").at(-1) as AuthField | undefined;
    if (field && authFields.has(field) && !result[field]) result[field] = issue.message;
    return result;
  }, {});
}

function retryMessage(error: ApiError) {
  if (!error.retryAfterSeconds) return "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد تلاش کنید.";
  return `تعداد درخواست‌ها بیش از حد مجاز است. ${error.retryAfterSeconds} ثانیه دیگر تلاش کنید.`;
}

export function getLoginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : "ورود ناموفق بود.";
  }
  if (error.status === 0) return "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.";
  if (error.status === 401) return "نام کاربری یا رمز عبور نادرست است.";
  if (error.status === 429) return retryMessage(error);
  return error.message;
}

export function getRegistrationErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : "ثبت‌نام ناموفق بود.";
  }
  if (error.status === 0) return "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.";
  if (error.status === 409) {
    const message = error.message.toLocaleLowerCase("en-US");
    if (message.includes("username")) return "این نام کاربری قبلاً ثبت شده است.";
    if (message.includes("phone")) return "این شماره تلفن قبلاً ثبت شده است.";
    if (message.includes("email")) return "این ایمیل قبلاً ثبت شده است.";
    return "کاربری با این اطلاعات قبلاً ثبت شده است.";
  }
  if (error.status === 429) return retryMessage(error);
  return error.message;
}
