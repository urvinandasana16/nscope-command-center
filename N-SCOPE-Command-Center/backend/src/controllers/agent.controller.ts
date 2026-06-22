import crypto from "crypto";
import type { Request, Response } from "express";
import { prisma } from "../prisma/client";
import {
  agentHeartbeatSchema,
  agentInventorySchema,
  agentRegisterSchema,
  agentUninstallSchema,
  agentTaskResultSchema,
} from "../validators/common";
import { AppError } from "../utils/http";

const db = prisma as any;

function hashToken(token: string) {
  return `sha256:${crypto.createHash("sha256").update(token).digest("hex")}`;
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function clean(value?: string | null) {
  const next = value?.trim();
  return next || undefined;
}

function remoteConsentRequired(deviceType?: string | null) {
  return (deviceType ?? "Workstation").toLowerCase() !== "server";
}

async function writeAgentAudit(action: string, description: string) {
  await db.auditLog.create({
    data: {
      action,
      module: "agents",
      description,
    },
  });
}

async function findInstallToken(rawToken: string) {
  return db.agentInstallToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { client: true, site: true },
  });
}

async function findDeviceForRegistration(payload: ReturnType<typeof agentRegisterSchema.parse>, installToken: any) {
  const serialNumber = clean(payload.serialNumber);
  const macAddress = clean(payload.macAddress);

  if (serialNumber) {
    const bySerial = await db.device.findFirst({
      where: { clientId: installToken.clientId, siteId: installToken.siteId, serialNumber },
    });
    if (bySerial) return bySerial;
  }

  if (macAddress) {
    const byMac = await db.device.findFirst({
      where: { clientId: installToken.clientId, siteId: installToken.siteId, macAddress },
    });
    if (byMac) return byMac;
  }

  return db.device.findFirst({
    where: {
      clientId: installToken.clientId,
      siteId: installToken.siteId,
      hostname: payload.hostname,
    },
  });
}

async function syncAssetForDevice(device: any, location = "") {
  const serialNumber = clean(device.serialNumber);
  const existingAsset = await db.asset.findFirst({
    where: {
      clientId: device.clientId,
      siteId: device.siteId,
      OR: [
        { deviceId: device.id },
        ...(serialNumber ? [{ serialNumber }] : []),
        { name: device.hostname },
      ],
    },
  });
  const assetData = {
    clientId: device.clientId,
    siteId: device.siteId,
    deviceId: device.id,
    name: device.hostname,
    assetTag: existingAsset?.assetTag ?? `AGENT-${device.id}`,
    serialNumber: serialNumber ?? device.id,
    deviceType: device.deviceType,
    assignedUser: device.assignedUser,
    location: existingAsset?.location ?? location,
    status: "ACTIVE",
  };

  if (existingAsset) {
    return db.asset.update({
      where: { id: existingAsset.id },
      data: assetData,
    });
  }

  return db.asset.create({ data: assetData });
}

async function authenticateAgent(req: Request) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) throw new AppError(401, "Agent token required");

  const agent = await db.agent.findFirst({
    where: { tokenHash: hashToken(token) },
    include: { device: true },
  });
  if (!agent) throw new AppError(401, "Invalid agent token");

  return agent;
}

function ensureAgentMatchesPayload(agent: any, agentId?: string) {
  if (agentId && agent.agentId !== agentId) {
    throw new AppError(403, "Agent token does not match requested agent");
  }
}

export async function registerAgent(req: Request, res: Response) {
  const payload = agentRegisterSchema.parse(req.body);
  const installToken = await findInstallToken(payload.installToken);

  if (!installToken) throw new AppError(401, "Invalid install token");
  if (installToken.isRevoked) throw new AppError(403, "Install token has been revoked");
  if (new Date(installToken.expiresAt).getTime() <= Date.now()) throw new AppError(403, "Install token has expired");
  if (installToken.usedCount >= installToken.maxUses) throw new AppError(403, "Install token usage limit reached");

  const now = new Date();
  const existingDevice = await findDeviceForRegistration(payload, installToken);
  const deviceData = {
    clientId: installToken.clientId,
    siteId: installToken.siteId,
    hostname: payload.hostname,
    os: payload.os,
    osName: clean(payload.osName) ?? null,
    osVersion: clean(payload.osVersion) ?? null,
    osBuild: clean(payload.osBuild) ?? null,
    ipAddress: clean(payload.ipAddress) ?? "",
    macAddress: clean(payload.macAddress) ?? "",
    deviceType: payload.deviceType,
    serialNumber: clean(payload.serialNumber) ?? null,
    biosSerialNumber: clean(payload.biosSerialNumber) ?? null,
    motherboardSerialNumber: clean(payload.motherboardSerialNumber) ?? null,
    manufacturer: clean(payload.manufacturer) ?? null,
    model: clean(payload.model) ?? null,
    cpu: clean(payload.cpu) ?? null,
    cpuCores: payload.cpuCores ?? null,
    ramBytes: payload.ramBytes ? BigInt(payload.ramBytes) : null,
    diskBytes: payload.diskBytes ? BigInt(payload.diskBytes) : null,
    diskFreeBytes: payload.diskFreeBytes ? BigInt(payload.diskFreeBytes) : null,
    diskModel: clean(payload.diskModel) ?? null,
    agentVersion: payload.agentVersion,
    remoteConsentRequired: remoteConsentRequired(payload.deviceType),
    lastUninstalledAt: null,
    status: "ONLINE",
    lastSeen: now,
  };

  const device = existingDevice
    ? await db.device.update({ where: { id: existingDevice.id }, data: deviceData })
    : await db.device.create({ data: deviceData });
  await syncAssetForDevice(device, installToken.site?.location ?? "");

  const rawAgentToken = generateToken();
  const existingAgent = await db.agent.findUnique({ where: { deviceId: device.id } });
  const agent = existingAgent
    ? await db.agent.update({
        where: { deviceId: device.id },
        data: {
          tokenHash: hashToken(rawAgentToken),
          installTokenId: installToken.id,
          version: payload.agentVersion,
          os: payload.os,
          status: "ONLINE",
          lastUninstalledAt: null,
          lastSeen: now,
        },
      })
    : await db.agent.create({
        data: {
          deviceId: device.id,
          agentId: crypto.randomUUID(),
          tokenHash: hashToken(rawAgentToken),
          installTokenId: installToken.id,
          version: payload.agentVersion,
          os: payload.os,
          status: "ONLINE",
          lastUninstalledAt: null,
          lastSeen: now,
        },
      });

  await db.agentInstallToken.update({
    where: { id: installToken.id },
    data: { usedCount: { increment: 1 } },
  });
  await writeAgentAudit("REGISTER", `Registered agent ${agent.agentId} for device ${device.hostname}`);

  return res.status(201).json({
    deviceId: device.id,
    agentId: agent.agentId,
    agentToken: rawAgentToken,
    heartbeatIntervalSeconds: 60,
    inventoryIntervalMinutes: 360,
  });
}

export async function agentUninstall(req: Request, res: Response) {
  const agent = await authenticateAgent(req);
  const payload = agentUninstallSchema.parse(req.body);
  ensureAgentMatchesPayload(agent, payload.agentId);

  const now = new Date();
  await db.agent.update({
    where: { agentId: agent.agentId },
    data: {
      status: "OFFLINE",
      lastUninstalledAt: now,
      lastSeen: now,
    },
  });
  await db.device.update({
    where: { id: agent.deviceId },
    data: {
      hostname: payload.hostname ?? agent.device.hostname,
      status: "OFFLINE",
      lastUninstalledAt: now,
      lastSeen: now,
    },
  });
  await writeAgentAudit("UNINSTALL", `Agent ${agent.agentId} uninstalled from ${payload.hostname ?? agent.device.hostname}${payload.uninstallReason ? `: ${payload.uninstallReason}` : ""}`);

  return res.json({ status: "ok", message: "Agent marked offline" });
}

export async function agentHeartbeat(req: Request, res: Response) {
  const agent = await authenticateAgent(req);
  const payload = agentHeartbeatSchema.parse(req.body);
  ensureAgentMatchesPayload(agent, payload.agentId);

  const now = new Date();
  await db.agent.update({
    where: { agentId: agent.agentId },
    data: {
      version: payload.agentVersion ?? agent.version,
      status: "ONLINE",
      lastSeen: now,
    },
  });
  const device = await db.device.update({
    where: { id: agent.deviceId },
    data: {
      hostname: payload.hostname ?? agent.device.hostname,
      ipAddress: payload.ipAddress ?? agent.device.ipAddress,
      macAddress: payload.macAddress ?? agent.device.macAddress,
      agentVersion: payload.agentVersion ?? agent.device.agentVersion,
      assignedUser: payload.loggedInUser ?? agent.device.assignedUser,
      status: "ONLINE",
      lastSeen: now,
    },
  });
  await db.agentHeartbeat.create({
    data: {
      agentId: agent.agentId,
      deviceId: agent.deviceId,
      cpuUsage: payload.cpuUsage,
      memoryUsage: payload.memoryUsage,
      diskUsage: payload.diskUsage,
      uptime: payload.uptime,
      loggedInUser: payload.loggedInUser,
      ipAddress: payload.ipAddress,
      macAddress: payload.macAddress,
    },
  });
  await db.deviceMetric.create({
    data: {
      deviceId: agent.deviceId,
      cpuUsage: payload.cpuUsage,
      memoryUsage: payload.memoryUsage,
      diskUsage: payload.diskUsage,
      uptime: payload.uptime,
    },
  });

  const pendingTaskCount = await db.agentTask.count({
    where: {
      deviceId: agent.deviceId,
      status: "PENDING",
      OR: [{ agentId: agent.agentId }, { agentId: null }],
    },
  });

  return res.json({ status: "ok", pendingTaskCount });
}

export async function agentInventory(req: Request, res: Response) {
  const agent = await authenticateAgent(req);
  const payload = agentInventorySchema.parse(req.body);
  ensureAgentMatchesPayload(agent, payload.agentId);

  const device = await db.device.update({
    where: { id: agent.deviceId },
    data: {
      hostname: payload.hostname ?? agent.device.hostname,
      os: payload.os ?? agent.device.os,
      osName: clean(payload.osName) ?? agent.device.osName,
      osVersion: clean(payload.osVersion) ?? agent.device.osVersion,
      osBuild: clean(payload.osBuild) ?? agent.device.osBuild,
      serialNumber: clean(payload.serialNumber) ?? agent.device.serialNumber,
      biosSerialNumber: clean(payload.biosSerialNumber) ?? agent.device.biosSerialNumber,
      motherboardSerialNumber: clean(payload.motherboardSerialNumber) ?? agent.device.motherboardSerialNumber,
      manufacturer: clean(payload.manufacturer) ?? agent.device.manufacturer,
      model: clean(payload.model) ?? agent.device.model,
      cpu: clean(payload.cpu) ?? agent.device.cpu,
      cpuCores: payload.cpuCores ?? agent.device.cpuCores,
      ramBytes: payload.ramBytes ? BigInt(payload.ramBytes) : agent.device.ramBytes,
      diskBytes: payload.diskBytes ? BigInt(payload.diskBytes) : agent.device.diskBytes,
      diskFreeBytes: payload.diskFreeBytes ? BigInt(payload.diskFreeBytes) : agent.device.diskFreeBytes,
      diskModel: clean(payload.diskModel) ?? agent.device.diskModel,
      ipAddress: payload.ipAddress ?? agent.device.ipAddress,
      macAddress: payload.macAddress ?? agent.device.macAddress,
      remoteConsentRequired: remoteConsentRequired(agent.device.deviceType),
      lastUninstalledAt: null,
      status: "ONLINE",
      lastSeen: new Date(),
    },
  });
  await syncAssetForDevice(device);

  await db.installedSoftware.deleteMany({ where: { deviceId: agent.deviceId } });
  if (payload.installedSoftware.length) {
    await db.installedSoftware.createMany({
      data: payload.installedSoftware.map((item) => ({
        deviceId: agent.deviceId,
        name: item.name,
        version: item.version,
        publisher: item.publisher,
        installDate: item.installDate,
        source: item.source,
      })),
    });
  }

  await db.deviceService.deleteMany({ where: { deviceId: agent.deviceId } });
  if (payload.services.length) {
    await db.deviceService.createMany({
      data: payload.services.map((item) => ({
        deviceId: agent.deviceId,
        serviceName: item.serviceName,
        displayName: item.displayName,
        status: item.status,
        startType: item.startType,
        pathName: item.pathName,
        accountName: item.accountName,
      })),
    });
  }

  await db.deviceProcess.deleteMany({ where: { deviceId: agent.deviceId } });
  if (payload.processes.length) {
    await db.deviceProcess.createMany({
      data: payload.processes.map((item) => ({
        deviceId: agent.deviceId,
        pid: item.pid,
        processName: item.processName,
        executablePath: item.executablePath,
        username: item.username,
        cpuUsage: item.cpuUsage,
        memoryBytes: item.memoryBytes ? BigInt(item.memoryBytes) : null,
      })),
    });
  }

  return res.json({
    status: "ok",
    installedSoftwareCount: payload.installedSoftware.length,
    serviceCount: payload.services.length,
    processCount: payload.processes.length,
  });
}

export async function listAgentTasks(req: Request, res: Response) {
  const agent = await authenticateAgent(req);
  const requestedAgentId = typeof req.query.agentId === "string" ? req.query.agentId : undefined;
  ensureAgentMatchesPayload(agent, requestedAgentId);

  const tasks = await db.agentTask.findMany({
    where: {
      deviceId: agent.deviceId,
      status: "PENDING",
      OR: [{ agentId: agent.agentId }, { agentId: null }],
    },
    orderBy: { createdAt: "asc" },
  });

  return res.json(tasks.map((task: any) => ({
    id: task.id,
    type: task.type,
    command: task.command,
    status: task.status,
    createdAt: task.createdAt,
  })));
}

export async function updateAgentTaskResult(req: Request, res: Response) {
  const agent = await authenticateAgent(req);
  const payload = agentTaskResultSchema.parse(req.body);
  const task = await db.agentTask.findFirst({
    where: {
      id: req.params.id,
      deviceId: agent.deviceId,
      OR: [{ agentId: agent.agentId }, { agentId: null }],
    },
  });
  if (!task) throw new AppError(404, "Agent task not found");

  const updated = await db.agentTask.update({
    where: { id: task.id },
    data: {
      status: payload.status,
      output: payload.output,
      errorOutput: payload.errorOutput,
      exitCode: payload.exitCode,
      finishedAt: new Date(),
    },
  });

  return res.json({ id: updated.id, status: updated.status });
}
