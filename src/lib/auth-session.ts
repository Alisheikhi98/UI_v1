import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
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
    const user = await loadAuthenticatedUser();
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
      queryKey: authenticatedUserQueryKey,
      queryFn: loadAuthenticatedUser,
      staleTime: 0,
      retry: false,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuthenticatedSession(queryClient);
    }
    return null;
  }
}

export function useAuthenticatedUser() {
  const token = useAccessToken();
  return useQuery({
    queryKey: authenticatedUserQueryKey,
    queryFn: loadAuthenticatedUser,
    enabled: typeof window !== "undefined" && Boolean(token),
    retry: false,
  });
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
