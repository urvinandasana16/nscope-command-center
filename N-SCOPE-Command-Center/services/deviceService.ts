import { apiRequest } from "@/lib/api";

export async function listDevices() {
  return apiRequest("/devices");
}

export async function getDevice(id: string) {
  return apiRequest(`/devices/${id}`);
}

export async function checkDeviceNow(id: string) {
  return apiRequest(`/devices/${id}/check-now`, { method: "POST" });
}

export async function listDeviceServices(id: string) {
  return apiRequest(`/devices/${id}/services`);
}

export async function listDeviceProcesses(id: string) {
  return apiRequest(`/devices/${id}/processes`);
}

export async function createDevice(data: unknown) {
  return apiRequest("/devices", { method: "POST", body: JSON.stringify(data) });
}

export async function updateDevice(id: string, data: unknown) {
  return apiRequest(`/devices/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteDevice(id: string) {
  return apiRequest(`/devices/${id}`, { method: "DELETE" });
}
