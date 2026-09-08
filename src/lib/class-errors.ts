import { ApiError } from "@/lib/api/client";
import {
  ClassAssignmentPartialFailureError,
  ClassAssignmentPersistenceVerificationError,
  ClassAssignmentSaveInProgressError,
} from "@/lib/api/class-assignment-reconciliation";
import { IncompatibleCreatedCourseError } from "@/lib/course-creation";

export type ClassField = "name" | "gradeId" | "majorId";
export type ClassFieldErrors = Partial<Record<ClassField, string>>;
export type CourseFieldErrors = { name?: string };

const backendFieldToFormField: Record<string, ClassField | undefined> = {
  name: "name",
  grade: "gradeId",
  major_id: "majorId",
};

const classValidationMessages: Record<ClassField, string> = {
  name: "نام کلاس وارد شده معتبر نیست.",
  gradeId: "پایه تحصیلی انتخاب شده معتبر نیست.",
  majorId: "رشته تحصیلی انتخاب شده معتبر نیست.",
};

const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

const normalizedApiMessage = (error: ApiError) => error.message.toLocaleLowerCase("en-US");

function commonApiErrorMessage(error: ApiError): string | null {
  if (error.status === 0) return "ارتباط با سرور برقرار نشد.";
  if (error.status === 401) return "نشست کاربری منقضی شده است. دوباره وارد شوید.";
  if (error.status === 403) return "شما اجازه انجام این عملیات را ندارید.";
  if (error.status === 429) {
    return error.retryAfterSeconds
      ? `تعداد درخواست‌ها بیش از حد مجاز است. ${error.retryAfterSeconds} ثانیه دیگر تلاش کنید.`
      : "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد تلاش کنید.";
  }
  return null;
}

export function getClassFieldErrors(error: unknown): ClassFieldErrors {
  if (!(error instanceof ApiError)) return {};

  if (error.status === 422) {
    return error.validationIssues.reduce<ClassFieldErrors>((result, issue) => {
      const backendField = issue.path.split(".").at(-1) ?? "";
      const field = backendFieldToFormField[backendField];
      if (field && !result[field]) result[field] = classValidationMessages[field];
      return result;
    }, {});
  }

  if (error.status === 409 && error.message.toLocaleLowerCase("en-US").includes("name")) {
    return { name: "کلاسی با این نام قبلاً در مدرسه ثبت شده است." };
  }

  return {};
}

export function getClassErrorMessage(error: unknown): string {
  if (!isApiError(error)) return "خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.";
  const commonMessage = commonApiErrorMessage(error);
  if (commonMessage) return commonMessage;
  if (error.status === 400) return "اطلاعات کلاس معتبر نیست.";
  if (error.status === 404) return "کلاس موردنظر در این مدرسه پیدا نشد.";
  if (error.status === 409) {
    return normalizedApiMessage(error).includes("name")
      ? "کلاسی با این نام قبلاً در مدرسه ثبت شده است."
      : "اطلاعات کلاس با اطلاعات موجود تداخل دارد.";
  }
  if (error.status === 422) return "اطلاعات کلاس معتبر نیست.";
  return "خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.";
}

export function getClassDeleteErrorMessage(error: unknown): string {
  if (!isApiError(error)) return "حذف کلاس با خطا مواجه شد. دوباره تلاش کنید.";
  const commonMessage = commonApiErrorMessage(error);
  if (commonMessage) return commonMessage;
  if (error.status === 400 || error.status === 422) return "درخواست حذف کلاس معتبر نیست.";
  if (error.status === 404) return "کلاس موردنظر در این مدرسه پیدا نشد.";
  if (error.status === 409) return "کلاس به دلیل وابستگی‌های موجود قابل حذف نیست.";
  return "حذف کلاس با خطا مواجه شد. دوباره تلاش کنید.";
}

export function getCourseErrorMessage(error: unknown): string {
  if (error instanceof IncompatibleCreatedCourseError) {
    return "درس ایجاد شد، اما با مشخصات تحصیلی این کلاس سازگار نیست.";
  }
  if (!isApiError(error)) return "عملیات درس با خطا مواجه شد. دوباره تلاش کنید.";
  const commonMessage = commonApiErrorMessage(error);
  if (commonMessage) return commonMessage;
  if (error.status === 400 || error.status === 422) return "اطلاعات درس معتبر نیست.";
  if (error.status === 404) return "درس موردنظر پیدا نشد.";
  if (error.status === 409) return "این درس قبلاً برای کلاس ثبت شده است.";
  return "عملیات درس با خطا مواجه شد. دوباره تلاش کنید.";
}

export function getCourseFieldErrors(error: unknown): CourseFieldErrors {
  if (!isApiError(error)) return {};
  if (error.status === 409) return { name: "درسی با این نام قبلاً ثبت شده است." };
  if (error.status !== 422) return {};
  return error.validationIssues.some((issue) => issue.path.split(".").at(-1) === "name")
    ? { name: "نام درس وارد شده معتبر نیست." }
    : {};
}

export function getAssignmentErrorMessage(error: unknown): string {
  if (error instanceof ClassAssignmentPartialFailureError) {
    return getAssignmentErrorMessage(error.cause);
  }
  if (error instanceof ClassAssignmentSaveInProgressError) {
    return "ذخیره دیگری برای این کلاس در حال انجام است.";
  }
  if (error instanceof ClassAssignmentPersistenceVerificationError) {
    return "تأیید نهایی ذخیره تنظیمات کلاس انجام نشد.";
  }
  if (!isApiError(error)) return "ذخیره تنظیمات کلاس با خطا مواجه شد.";
  const commonMessage = commonApiErrorMessage(error);
  if (commonMessage) return commonMessage;
  if (error.status === 400 || error.status === 422) {
    return "اطلاعات ردیف‌های کلاس معتبر نیست.";
  }
  if (error.status === 404) return "یکی از کلاس، درس یا معلمان انتخاب‌شده پیدا نشد.";
  if (error.status === 409) {
    return normalizedApiMessage(error).includes("already assigned")
      ? "این درس قبلاً برای کلاس ثبت شده است."
      : "ذخیره تنظیمات کلاس با اطلاعات موجود تداخل دارد.";
  }
  return "ذخیره تنظیمات کلاس با خطا مواجه شد.";
}
