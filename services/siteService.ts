import { apiRequest } from "@/lib/api";

export async function listSites() {
  return apiRequest("/sites");
}

export async function getSite(id: string) {
  return apiRequest(`/sites/${id}`);
}

export async function createSite(data: unknown) {
  return apiRequest("/sites", { method: "POST", body: JSON.stringify(data) });
}

export async function updateSite(id: string, data: unknown) {
  return apiRequest(`/sites/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteSite(id: string) {
  return apiRequest(`/sites/${id}`, { method: "DELETE" });
}
