export function deriveDeviceStatus(device: { derivedStatus?: string | null; status?: string | null; lastSeen?: string | null; lastUninstalledAt?: string | null }) {
  if (device.derivedStatus) return device.derivedStatus;
  if (device.lastUninstalledAt) return "OFFLINE";
  if (!device.lastSeen) return device.status ?? "OFFLINE";

  const lastSeen = new Date(device.lastSeen).getTime();
  if (Number.isNaN(lastSeen)) return device.status ?? "OFFLINE";

  const ageMs = Date.now() - lastSeen;
  if (ageMs <= 2 * 60 * 1000) return "ONLINE";
  if (ageMs < 10 * 60 * 1000) return "STALE";
  return "OFFLINE";
}

export function displayStatus(value?: string | null) {
  return String(value ?? "OFFLINE").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function parseWindowsOs(value?: string | null) {
  const raw = String(value ?? "Windows").replace(/\s+/g, " ").trim();
  const version = raw.match(/\b\d+\.\d+\.\d+(?:\.\d+)?\b/)?.[0];
  const build = raw.match(/Build\s+(\d+(?:\.\d+)?)/i)?.[1] ?? version;
  let name = raw
    .replace(/\b\d+\.\d+\.\d+(?:\.\d+)?\b/g, "")
    .replace(/Build\s+\d+(?:\.\d+)?/gi, "")
    .replace(/^Microsoft\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  name = name || "Windows";
  return { name, version, build };
}

export function compactOs(value?: string | null, explicitName?: string | null) {
  return explicitName || parseWindowsOs(value).name;
}

export function formatBytes(value?: number | string | bigint | null) {
  if (value === undefined || value === null || value === "") return "Not detected";
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return "Not detected";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let next = size;
  let index = 0;
  while (next >= 1024 && index < units.length - 1) {
    next /= 1024;
    index += 1;
  }
  return `${next.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
