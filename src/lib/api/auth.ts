import { publicApiRequest } from "@/lib/api/client";

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
}

export function loginUser(username: string, password: string): Promise<TokenResponse> {
  const form = new URLSearchParams({ username, password });
  return publicApiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
}

export function registerUser(data: {
  username: string;
  full_name: string;
  phone_number: string;
  email?: string | null;
  password: string;
}) {
  return publicApiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ ...data, email: data.email ?? null }),
  });
}
