import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { createContext, createElement, useContext, type ReactNode } from "react";
import {
  changeCurrentUserPassword,
  getCurrentUser,
  loginUser,
  updateCurrentUser,
  type AuthenticatedUser,
  type ChangePasswordInput,
  type UpdateAuthenticatedUserInput,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { clearAccessToken, getAccessToken, setAccessToken, useAccessToken } from "@/lib/auth-token";
import { setActiveSchoolId } from "@/lib/active-school";
import { clearAllGeneratorPreviewReferences } from "@/lib/generator-preview-session";

export const authenticatedUserQueryKey = ["auth", "current-user"] as const;
export const useMockAuthentication = import.meta.env.VITE_USE_MOCK_API === "true";
const AUTHENTICATED_USER_STALE_TIME = Number.POSITIVE_INFINITY;

export type AuthSessionStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthSessionContextValue {
  status: AuthSessionStatus;
  user: AuthenticatedUser | null;
  userQuery: UseQueryResult<AuthenticatedUser, Error>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

let mockUser: AuthenticatedUser = {
  id: 0,
  username: "dev-user",
  full_name: "کاربر توسعه",
  email: null,
  phone_number: "",
  referral_code: "",
};

export function buildLoginUrl(destination?: string) {
  return destination ? `/auth/login?redirect=${encodeURIComponent(destination)}` : "/auth/login";
}

export async function loadAuthenticatedUser(): Promise<AuthenticatedUser> {
  const token = getAccessToken();
  if (!token) throw new ApiError("Authentication is required.", 401);
  if (useMockAuthentication && token === "dev-mock-token") return mockUser;
  return getCurrentUser();
}

export function clearAuthenticatedSession(queryClient: QueryClient) {
  clearAccessToken();
  setActiveSchoolId(null);
  clearAllGeneratorPreviewReferences();
  queryClient.clear();
}

export async function loginAndBootstrap(
  queryClient: QueryClient,
  username: string,
  password: string,
): Promise<AuthenticatedUser> {
  if (useMockAuthentication) {
    setAccessToken("dev-mock-token");
    setActiveSchoolId(null);
    queryClient.setQueryData(authenticatedUserQueryKey, mockUser);
    return mockUser;
  }

  const response = await loginUser(username, password);
  setAccessToken(response.access_token);

  try {
    const user = await queryClient.fetchQuery(authenticatedUserQueryOptions());
    setActiveSchoolId(null);
    queryClient.setQueryData(authenticatedUserQueryKey, user);
    return user;
  } catch (error) {
    clearAuthenticatedSession(queryClient);
    throw error;
  }
}

export async function validateStoredSession(
  queryClient: QueryClient,
): Promise<AuthenticatedUser | null> {
  if (!getAccessToken()) return null;
  try {
    return await queryClient.fetchQuery({
      ...authenticatedUserQueryOptions(),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuthenticatedSession(queryClient);
      return null;
    }
    throw error;
  }
}

function authenticatedUserQueryOptions() {
  return {
    queryKey: authenticatedUserQueryKey,
    queryFn: loadAuthenticatedUser,
    staleTime: AUTHENTICATED_USER_STALE_TIME,
    retry: false,
  } as const;
}

export function resolveAuthSessionStatus({
  hasToken,
  hasUser,
  isUnauthorized,
}: {
  hasToken: boolean;
  hasUser: boolean;
  isUnauthorized: boolean;
}): AuthSessionStatus {
  if (!hasToken || isUnauthorized) return "unauthenticated";
  return hasUser ? "authenticated" : "loading";
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const token = useAccessToken();
  const userQuery = useQuery({
    ...authenticatedUserQueryOptions(),
    enabled: typeof window !== "undefined" && Boolean(token),
  });
  const status = resolveAuthSessionStatus({
    hasToken: Boolean(token),
    hasUser: Boolean(userQuery.data),
    isUnauthorized: userQuery.error instanceof ApiError && userQuery.error.status === 401,
  });

  return createElement(
    AuthSessionContext.Provider,
    { value: { status, user: userQuery.data ?? null, userQuery } },
    children,
  );
}

export function useAuthSession() {
  const session = useContext(AuthSessionContext);
  if (!session) throw new Error("useAuthSession must be used within AuthSessionProvider.");
  return session;
}

export function useAuthenticatedUser() {
  return useAuthSession().userQuery;
}

export function useUpdateAuthenticatedUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateAuthenticatedUserInput) => {
      if (useMockAuthentication) {
        mockUser = { ...mockUser, ...input };
      } else {
        await updateCurrentUser(input);
      }

      await queryClient.invalidateQueries({
        queryKey: authenticatedUserQueryKey,
        exact: true,
      });
      return queryClient.fetchQuery({
        queryKey: authenticatedUserQueryKey,
        queryFn: loadAuthenticatedUser,
        staleTime: 0,
        retry: false,
      });
    },
  });
}

export function useChangeAuthenticatedUserPassword() {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      if (useMockAuthentication) return;
      await changeCurrentUserPassword(input);
    },
  });
}
