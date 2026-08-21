import { ApiError, apiResponse } from "@/lib/api/client";
import { toApiId } from "@/lib/api/mappers";
import type { TimetableViewMode } from "@/lib/timetable";

export const XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface WeeklyPlanExcelRequest {
  mode: TimetableViewMode;
  schoolId: string;
  classId?: string;
  teacherId?: string;
}

type ResponseRequester = (path: string, init?: RequestInit) => Promise<Response>;

const FALLBACK_FILENAMES: Record<TimetableViewMode, string> = {
  school: "chiideman-school-timetable.xlsx",
  class: "chiideman-class-timetable.xlsx",
  teacher: "chiideman-teacher-timetable.xlsx",
};

export function getWeeklyPlanExcelPath({
  mode,
  schoolId,
  classId,
  teacherId,
}: WeeklyPlanExcelRequest) {
  const apiSchoolId = toApiId(schoolId, "schoolId");
  if (mode === "school") return `/schools/${apiSchoolId}/weekly-plan.xlsx`;
  if (mode === "class") {
    return `/schools/${apiSchoolId}/classes/${toApiId(classId ?? "", "classId")}/weekly-plan.xlsx`;
  }
  return `/schools/${apiSchoolId}/teachers/${toApiId(teacherId ?? "", "teacherId")}/weekly-plan.xlsx`;
}

function sanitizeFilename(value: string, fallback: string) {
  const filename = value
    .split("")
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .split(/[\\/]/)
    .at(-1)
    ?.trim();
  return filename && filename.toLowerCase().endsWith(".xlsx") ? filename : fallback;
}

export function getExcelDownloadFilename(
  contentDisposition: string | null,
  mode: TimetableViewMode,
) {
  const fallback = FALLBACK_FILENAMES[mode];
  if (!contentDisposition) return fallback;

  const encoded = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return sanitizeFilename(decodeURIComponent(encoded.trim().replace(/^"|"$/g, "")), fallback);
    } catch {
      return fallback;
    }
  }

  const plain = contentDisposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  return sanitizeFilename((plain?.[1] ?? plain?.[2] ?? "").trim(), fallback);
}

async function isXlsxBlob(blob: Blob) {
  if (blob.size < 2) return false;
  const signature = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  return signature[0] === 0x50 && signature[1] === 0x4b;
}

export async function fetchWeeklyPlanExcel(
  input: WeeklyPlanExcelRequest,
  request: ResponseRequester = apiResponse,
) {
  const response = await request(getWeeklyPlanExcelPath(input), {
    method: "GET",
    headers: { Accept: XLSX_MEDIA_TYPE },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const blob = await response.blob();

  if (!contentType.toLowerCase().includes(XLSX_MEDIA_TYPE) || !(await isXlsxBlob(blob))) {
    throw new ApiError("The server response is not a valid XLSX workbook.", 502);
  }

  return {
    blob,
    filename: getExcelDownloadFilename(response.headers.get("content-disposition"), input.mode),
  };
}

export function saveBlobAsDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadWeeklyPlanExcel(input: WeeklyPlanExcelRequest) {
  const file = await fetchWeeklyPlanExcel(input);
  saveBlobAsDownload(file.blob, file.filename);
}

export function getWeeklyPlanExcelErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.";
  }
  if (error.status === 0) return "ارتباط با سرور برقرار نشد.";
  if (error.status === 401) return "نشست شما منقضی شده است. دوباره وارد شوید.";
  if (error.status === 403) return "اجازه دانلود فایل Excel را ندارید.";
  if (error.status === 404) return "برنامه هفتگی برای دانلود در دسترس نیست.";
  if (error.status === 422) return "اطلاعات لازم برای دانلود فایل Excel معتبر نیست.";
  if (error.status === 429) return "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.";
  return "دانلود فایل Excel انجام نشد. دوباره تلاش کنید.";
}
