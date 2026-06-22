import { z } from "zod";

const optionalRelationId = z.preprocess(
  (value) => value === "" ? null : value,
  z.string().min(1).optional().nullable()
);

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const clientSchema = z.object({
  name: z.string().min(2),
  contactPerson: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(5),
  address: z.string().optional(),
  status: z.enum(["HEALTHY", "WARNING", "CRITICAL", "INACTIVE"]).optional(),
  slaPlan: z.string().min(2),
  assignedEngineerId: optionalRelationId,
});

export const siteSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(2),
  location: z.string().min(2),
  networkRange: z.string().min(3),
  status: z.enum(["HEALTHY", "WARNING", "CRITICAL", "INACTIVE"]).optional(),
  assignedEngineerId: optionalRelationId,
});

export const deviceSchema = z.object({
  clientId: z.string().min(1),
  siteId: z.string().min(1),
  hostname: z.string().min(2),
  os: z.string().min(2),
  osName: z.string().optional().nullable(),
  osVersion: z.string().optional().nullable(),
  osBuild: z.string().optional().nullable(),
  ipAddress: z.string().min(3),
  macAddress: z.string().min(3),
  status: z.enum(["ONLINE", "OFFLINE", "WARNING", "CRITICAL", "RETIRED"]).optional(),
  lastSeen: z.string().datetime().optional(),
  agentVersion: z.string().optional(),
  assignedUser: z.string().optional(),
  deviceType: z.string().min(2),
  serialNumber: z.string().optional(),
  biosSerialNumber: z.string().optional().nullable(),
  motherboardSerialNumber: z.string().optional().nullable(),
  cpu: z.string().optional().nullable(),
  cpuCores: z.number().int().nonnegative().optional().nullable(),
  ramBytes: z.number().int().nonnegative().optional().nullable(),
  diskBytes: z.number().int().nonnegative().optional().nullable(),
  diskFreeBytes: z.number().int().nonnegative().optional().nullable(),
  diskModel: z.string().optional().nullable(),
  remoteConsentRequired: z.boolean().optional(),
});

export const assetSchema = z.object({
  clientId: z.string().min(1),
  siteId: z.string().min(1),
  deviceId: z.string().min(1).optional().nullable(),
  name: z.string().optional(),
  assetTag: z.string().min(2),
  serialNumber: z.string().min(2),
  deviceType: z.string().min(2),
  assignedUser: z.string().optional(),
  location: z.string().min(2),
  purchaseDate: z.string().datetime().optional(),
  warrantyExpiry: z.string().datetime().optional(),
  status: z.enum(["ACTIVE", "AT_RISK", "SERVICE_DUE", "RETIRED"]).optional(),
});

export const ticketSchema = z.object({
  ticketNumber: z.string().min(2).optional(),
  clientId: z.string().min(1),
  siteId: z.string().min(1).optional().nullable(),
  deviceId: z.string().min(1).optional().nullable(),
  assetId: z.string().min(1).optional().nullable(),
  subject: z.string().min(3),
  description: z.string().min(3),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  status: z.enum(["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  assignedEngineerId: optionalRelationId,
  slaDue: z.string().datetime().optional(),
});

export const commentSchema = z.object({
  comment: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const userCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["SUPER_ADMIN", "NOC_ENGINEER", "SUPPORT_ENGINEER", "CLIENT_ADMIN", "CLIENT_VIEWER"]),
  clientId: z.string().min(1).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const agentInstallTokenCreateSchema = z.object({
  clientId: z.string().min(1),
  siteId: z.string().min(1),
  os: z.enum(["WINDOWS"]).default("WINDOWS"),
  agentType: z.enum(["MODERN_WINDOWS", "LEGACY_WINDOWS"]).default("MODERN_WINDOWS"),
  deviceType: z.enum(["Workstation", "Server"]).default("Workstation"),
  expiresInHours: z.number().int().min(1).max(24 * 30).default(24),
  maxUses: z.number().int().min(1).max(100).default(1),
});

export const agentRegisterSchema = z.object({
  installToken: z.string().min(16),
  hostname: z.string().min(1),
  os: z.string().min(1),
  osName: z.string().optional(),
  osVersion: z.string().optional(),
  osBuild: z.string().optional(),
  serialNumber: z.string().optional(),
  macAddress: z.string().optional(),
  ipAddress: z.string().optional(),
  deviceType: z.string().default("Workstation"),
  agentVersion: z.string().default("1.0.0"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  biosSerialNumber: z.string().optional(),
  motherboardSerialNumber: z.string().optional(),
  cpu: z.string().optional(),
  cpuCores: z.number().int().nonnegative().optional(),
  ramBytes: z.number().int().nonnegative().optional(),
  diskBytes: z.number().int().nonnegative().optional(),
  diskFreeBytes: z.number().int().nonnegative().optional(),
  diskModel: z.string().optional(),
});

export const agentUninstallSchema = z.object({
  agentId: z.string().min(1),
  hostname: z.string().optional(),
  uninstallReason: z.string().optional(),
});

export const agentHeartbeatSchema = z.object({
  agentId: z.string().min(1),
  hostname: z.string().optional(),
  cpuUsage: z.number().optional(),
  memoryUsage: z.number().optional(),
  diskUsage: z.number().optional(),
  uptime: z.string().optional(),
  loggedInUser: z.string().optional(),
  ipAddress: z.string().optional(),
  macAddress: z.string().optional(),
  agentVersion: z.string().optional(),
});

export const agentInventorySchema = z.object({
  agentId: z.string().min(1),
  hostname: z.string().optional(),
  os: z.string().optional(),
  osName: z.string().optional(),
  osVersion: z.string().optional(),
  osBuild: z.string().optional(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  biosSerialNumber: z.string().optional(),
  motherboardSerialNumber: z.string().optional(),
  cpu: z.string().optional(),
  cpuCores: z.number().int().nonnegative().optional(),
  ramBytes: z.number().int().nonnegative().optional(),
  diskBytes: z.number().int().nonnegative().optional(),
  diskFreeBytes: z.number().int().nonnegative().optional(),
  diskModel: z.string().optional(),
  ipAddress: z.string().optional(),
  macAddress: z.string().optional(),
  installedSoftware: z.array(z.object({
    name: z.string().min(1),
    version: z.string().optional(),
    publisher: z.string().optional(),
    installDate: z.string().optional(),
    source: z.string().optional(),
  })).default([]),
  services: z.array(z.object({
    serviceName: z.string().min(1),
    displayName: z.string().optional(),
    status: z.string().min(1),
    startType: z.string().optional(),
    pathName: z.string().optional(),
    accountName: z.string().optional(),
  })).default([]),
  processes: z.array(z.object({
    pid: z.number().int().nonnegative(),
    processName: z.string().min(1),
    executablePath: z.string().optional(),
    username: z.string().optional(),
    cpuUsage: z.number().optional(),
    memoryBytes: z.number().int().nonnegative().optional(),
  })).default([]),
});

export const agentTaskResultSchema = z.object({
  status: z.enum(["SUCCESS", "FAILED", "RUNNING", "CANCELLED"]),
  output: z.string().optional(),
  errorOutput: z.string().optional(),
  exitCode: z.number().int().optional(),
});
