import { apiRequest } from "@/lib/api";

export type RemoteControlStatus = {
  configured: boolean;
  message: string;
  meshCentralUrl?: string;
  apiEnabled?: boolean;
};

export type DeviceRemoteControl = {
  configured: boolean;
  message?: string;
  remoteControlEnabled?: boolean;
  remoteConsentRequired?: boolean;
  consentMessage?: string;
  meshNodeId?: string;
  remoteUrl?: string;
  terminalUrl?: string;
  fileManagerUrl?: string;
};

export async function getRemoteControlStatus() {
  return apiRequest<RemoteControlStatus>("/remote-control/status");
}

export async function getDeviceRemoteControl(deviceId: string) {
  return apiRequest<DeviceRemoteControl>(`/devices/${deviceId}/remote-control`);
}
