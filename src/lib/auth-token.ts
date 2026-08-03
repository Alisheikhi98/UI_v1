import { useSyncExternalStore } from "react";

export const ACCESS_TOKEN_STORAGE_KEY = "access_token";

let accessToken: string | null | undefined;
const listeners = new Set<() => void>();

function readStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

function getSnapshot(): string | null {
  if (accessToken === undefined) accessToken = readStoredAccessToken();
  return accessToken;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAccessToken(): string | null {
  return getSnapshot();
}

export function setAccessToken(token: string) {
  const normalizedToken = token.trim();
  if (!normalizedToken) throw new Error("Access token cannot be empty.");
  accessToken = normalizedToken;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, normalizedToken);
  }
  listeners.forEach((listener) => listener());
}

export function clearAccessToken() {
  accessToken = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
  listeners.forEach((listener) => listener());
}

export function useAccessToken() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
