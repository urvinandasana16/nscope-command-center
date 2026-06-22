import { apiRequest } from "@/lib/api";

export async function listClients() {
  return apiRequest("/clients");
}

export async function getClient(id: string) {
  return apiRequest(`/clients/${id}`);
}

export async function createClient(data: unknown) {
  return apiRequest("/clients", { method: "POST", body: JSON.stringify(data) });
}

export async function updateClient(id: string, data: unknown) {
  return apiRequest(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteClient(id: string) {
  return apiRequest(`/clients/${id}`, { method: "DELETE" });
}
