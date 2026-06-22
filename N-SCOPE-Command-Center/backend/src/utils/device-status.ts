type DeviceLike = {
  status?: string | null;
  lastSeen?: Date | string | null;
  lastUninstalledAt?: Date | string | null;
};

const staleAfterMs = 2 * 60 * 1000;
const offlineAfterMs = 10 * 60 * 1000;

export function deriveDeviceStatus(device: DeviceLike, now = new Date()) {
  if (device.lastUninstalledAt) return "OFFLINE";
  if (!device.lastSeen) return device.status ?? "OFFLINE";

  const lastSeen = new Date(device.lastSeen).getTime();
  if (Number.isNaN(lastSeen)) return device.status ?? "OFFLINE";

  const ageMs = now.getTime() - lastSeen;
  if (ageMs <= staleAfterMs) return "ONLINE";
  if (ageMs < offlineAfterMs) return "STALE";
  return "OFFLINE";
}

export function withDerivedDeviceStatus<T extends DeviceLike>(device: T, now = new Date()) {
  return {
    ...device,
    derivedStatus: deriveDeviceStatus(device, now),
  };
}
