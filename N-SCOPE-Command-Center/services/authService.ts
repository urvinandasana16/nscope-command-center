import { apiRequest } from "@/lib/api";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  clientId: string | null;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (typeof window !== "undefined") {
    window.localStorage.setItem("nscope_token", response.token);
    window.localStorage.setItem("nscope_user", JSON.stringify(response.user));
  }

  return response;
}

export async function getCurrentUser() {
  return apiRequest<AuthUser>("/auth/me");
}

export async function logout() {
  return apiRequest<{ message: string }>("/auth/logout", { method: "POST" });
}
