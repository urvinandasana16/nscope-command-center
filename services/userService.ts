import { apiRequest } from "@/lib/api";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  clientId?: string | null;
  status?: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: "CLIENT_ADMIN" | "CLIENT_VIEWER" | "SUPER_ADMIN" | "NOC_ENGINEER" | "SUPPORT_ENGINEER";
  clientId?: string | null;
  status?: "ACTIVE" | "INACTIVE";
};

export async function listUsers() {
  return apiRequest<UserRecord[]>("/users");
}

export async function createUser(data: CreateUserInput) {
  return apiRequest<UserRecord>("/users", { method: "POST", body: JSON.stringify(data) });
}
