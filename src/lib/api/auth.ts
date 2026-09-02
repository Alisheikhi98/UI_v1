import { apiRequest, publicApiRequest } from "@/lib/api/client";

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  full_name: string;
  email: string | null;
  phone_number: string;
  referral_code: string;
}

export interface RegisterUserInput {
  username: string;
  full_name: string;
  phone_number: string;
  email?: string | null;
  password: string;
  referral_code?: string | null;
}

export interface UpdateAuthenticatedUserInput {
  username?: string;
  full_name?: string;
  phone_number?: string;
  email?: string | null;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

export function buildLoginForm(username: string, password: string) {
  return new URLSearchParams({ username, password });
}

export function buildRegistrationPayload(data: RegisterUserInput): RegisterUserInput {
  const referralCode = data.referral_code?.trim();

  return {
    username: data.username,
    full_name: data.full_name,
    phone_number: data.phone_number,
    email: data.email ?? null,
    password: data.password,
    ...(referralCode ? { referral_code: referralCode } : {}),
  };
}

export function buildProfileUpdatePayload(
  data: UpdateAuthenticatedUserInput,
): UpdateAuthenticatedUserInput {
  return {
    username: data.username,
    full_name: data.full_name,
    phone_number: data.phone_number,
    email: data.email ?? null,
  };
}

export function buildPasswordChangePayload(data: ChangePasswordInput): ChangePasswordInput {
  return {
    current_password: data.current_password,
    new_password: data.new_password,
  };
}

export function loginUser(username: string, password: string): Promise<TokenResponse> {
  const form = buildLoginForm(username, password);
  return publicApiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
}

export function registerUser(data: RegisterUserInput): Promise<AuthenticatedUser> {
  return publicApiRequest<AuthenticatedUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify(buildRegistrationPayload(data)),
  });
}

export function getCurrentUser(): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>("/users/me");
}

export function updateCurrentUser(data: UpdateAuthenticatedUserInput): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(buildProfileUpdatePayload(data)),
  });
}

export function changeCurrentUserPassword(data: ChangePasswordInput): Promise<void> {
  return apiRequest<void>("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify(buildPasswordChangePayload(data)),
  });
}
