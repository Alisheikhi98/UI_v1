import { getAccessToken } from "@/lib/auth-token";

export interface ApiValidationIssue {
  path: string;
  message: string;
  type?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;
  readonly validationIssues: ApiValidationIssue[];
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    details?: unknown,
    validationIssues: ApiValidationIssue[] = [],
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.validationIssues = validationIssues;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!baseUrl) throw new ApiError("VITE_API_BASE_URL is not configured.", 0);
  return baseUrl.replace(/\/$/, "");
}

function validationIssues(body: unknown): ApiValidationIssue[] {
  if (!body || typeof body !== "object" || !("detail" in body)) return [];
  const detail = (body as { detail?: unknown }).detail;
  if (!Array.isArray(detail)) return [];
  return detail.flatMap((item) => {
    if (!item || typeof item !== "object" || !("msg" in item)) return [];
    const issue = item as { loc?: unknown; msg: unknown; type?: unknown };
    const path = Array.isArray(issue.loc) ? issue.loc.slice(1).map(String).join(".") : "";
    return [
      { path, message: String(issue.msg), type: issue.type ? String(issue.type) : undefined },
    ];
  });
}

function detailMessage(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }
  return null;
}

function getErrorMessage(body: unknown, status: number, issues: ApiValidationIssue[]) {
  if (issues.length > 0) return issues.map((issue) => issue.message).join("، ");
  if (body && typeof body === "object") {
    if ("detail" in body) {
      const message = detailMessage((body as { detail?: unknown }).detail);
      if (message) return message;
    }
    if ("message" in body && typeof (body as { message?: unknown }).message === "string") {
      return String((body as { message: string }).message);
    }
  }
  const statusMessages: Record<number, string> = {
    401: "Authentication is required or the access token has expired.",
    403: "You do not have permission to access this school.",
    409: "The request conflicts with existing data.",
    422: "The submitted data is invalid.",
    429: "Too many requests. Please try again later.",
  };
  return statusMessages[status] ?? `Request failed with status ${status}.`;
}

async function fetchResponse(
  path: string,
  init: RequestInit,
  requiresAuth: boolean,
): Promise<Response> {
  const token = getAccessToken();
  if (requiresAuth && !token) throw new ApiError("Please sign in before continuing.", 401);

  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Could not connect to the API.",
      0,
      error,
    );
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const body =
      response.status === 204
        ? undefined
        : contentType.includes("application/json")
          ? await response.json()
          : await response.text();
    const issues = validationIssues(body);
    const retryAfter = Number(response.headers.get("Retry-After"));
    const error = new ApiError(
      getErrorMessage(body, response.status, issues),
      response.status,
      body,
      issues,
      Number.isFinite(retryAfter) ? retryAfter : undefined,
    );
    if (requiresAuth && response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("api:unauthorized", { detail: error }));
    }
    throw error;
  }

  return response;
}

async function request<T>(path: string, init: RequestInit, requiresAuth: boolean): Promise<T> {
  const response = await fetchResponse(path, init, requiresAuth);
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  return (
    contentType.includes("application/json") ? await response.json() : await response.text()
  ) as T;
}

export function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init, true);
}

export function publicApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init, false);
}

/** Returns an authenticated successful response for non-JSON resources such as downloads. */
export function apiResponse(path: string, init: RequestInit = {}): Promise<Response> {
  return fetchResponse(path, init, true);
}
