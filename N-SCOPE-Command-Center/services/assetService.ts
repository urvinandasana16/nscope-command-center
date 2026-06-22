import { apiRequest } from "@/lib/api";

export async function listAssets() {
  return apiRequest("/assets");
}

export async function getAsset(id: string) {
  return apiRequest(`/assets/${id}`);
}

export async function createAsset(data: unknown) {
  return apiRequest("/assets", { method: "POST", body: JSON.stringify(data) });
}

export async function updateAsset(id: string, data: unknown) {
  return apiRequest(`/assets/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteAsset(id: string) {
  return apiRequest(`/assets/${id}`, { method: "DELETE" });
}
