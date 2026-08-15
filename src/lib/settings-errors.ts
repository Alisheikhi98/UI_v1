import { ApiError } from "@/lib/api/client";

export type SettingsField =
  | "username"
  | "full_name"
  | "phone_number"
  | "email"
  | "current_password"
  | "new_password"
  | "confirm_password";

export type SettingsFieldErrors = Partial<Record<SettingsField, string>>;

const settingsFields = new Set<SettingsField>([
  "username",
  "full_name",
  "phone_number",
  "email",
  "current_password",
  "new_password",
]);

const validationMessages: Record<Exclude<SettingsField, "confirm_password">, string> = {
  username: "نام کاربری باید بین ۳ تا ۱۰۰ نویسه باشد.",
  full_name: "نام و نام خانوادگی باید بین ۳ تا ۱۰۰ نویسه باشد.",
  phone_number: "شماره تلفن باید یک شماره موبایل معتبر ایران باشد.",
  email: "ایمیل واردشده معتبر نیست.",
  current_password: "رمز عبور فعلی را وارد کنید.",
  new_password: "رمز عبور جدید باید شامل حرف بزرگ، حرف کوچک و عدد باشد.",
};

const conflictMessages = {
  username: "این نام کاربری قبلاً ثبت شده است.",
  phone_number: "این شماره تلفن قبلاً ثبت شده است.",
  email: "این ایمیل قبلاً ثبت شده است.",
  generic: "اطلاعات واردشده با اطلاعات حساب دیگری تداخل دارد.",
} as const;

function serializedError(error: ApiError) {
  let details = "";
  try {
    details = JSON.stringify(error.details ?? "");
  } catch {
    // Details are used only to classify the error and are never displayed.
  }
  return `${error.message} ${details}`.toLocaleLowerCase("en-US");
}

function conflictField(error: ApiError): "username" | "phone_number" | "email" | null {
  const text = serializedError(error);
  if (/user[_\s-]?name/.test(text)) return "username";
  if (/phone(?:[_\s-]?number)?/.test(text)) return "phone_number";
  if (/e[-_\s]?mail/.test(text)) return "email";
  return null;
}

function currentPasswordIsIncorrect(error: ApiError) {
  return error.status === 400 && /current[_\s-]?password/.test(serializedError(error));
}

export function getSettingsFieldErrors(error: unknown): SettingsFieldErrors {
  if (!(error instanceof ApiError)) return {};
  if (currentPasswordIsIncorrect(error)) {
    return { current_password: "رمز عبور فعلی نادرست است." };
  }
  if (error.status === 409) {
    const field = conflictField(error);
    if (field) return { [field]: conflictMessages[field] };
  }
  if (error.status !== 422) return {};
  return error.validationIssues.reduce<SettingsFieldErrors>((result, issue) => {
    const field = issue.path.split(".").at(-1) as SettingsField | undefined;
    if (field && settingsFields.has(field) && !result[field]) {
      result[field] = validationMessages[field as Exclude<SettingsField, "confirm_password">];
    }
    return result;
  }, {});
}

export function getSettingsErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.";
  if (error.status === 0) return "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.";
  if (currentPasswordIsIncorrect(error)) return "رمز عبور فعلی نادرست است.";
  if (error.status === 400) return "اطلاعات واردشده معتبر نیست.";
  if (error.status === 401) return "نشست شما منقضی شده است. دوباره وارد شوید.";
  if (error.status === 403) return "اجازه انجام این عملیات را ندارید.";
  if (error.status === 404) return "حساب کاربری موردنظر پیدا نشد.";
  if (error.status === 409) {
    const field = conflictField(error);
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

export function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): SettingsFieldErrors {
  const errors: SettingsFieldErrors = {};
  if (!currentPassword) errors.current_password = "رمز عبور فعلی را وارد کنید.";
  if (newPassword.length < 8 || newPassword.length > 128) {
    errors.new_password = "رمز عبور باید بین ۸ تا ۱۲۸ نویسه باشد.";
  } else if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    errors.new_password = "رمز عبور باید شامل حرف بزرگ، حرف کوچک و عدد باشد.";
  }
  if (newPassword !== confirmPassword) {
    errors.confirm_password = "تکرار رمز عبور با رمز جدید یکسان نیست.";
  }
  return errors;
}
