import type { Request, Response } from "express";
import { getClientScope } from "../middleware/roles.middleware";
import { prisma } from "../prisma/client";
import { withDerivedDeviceStatus } from "../utils/device-status";
import { AppError } from "../utils/http";
import { jsonSafe } from "../utils/json-safe";
import { writeAuditLog } from "../services/audit.service";

const db = prisma as any;

function deviceWhere(req: Request, id: string) {
  const clientId = getClientScope(req);
  return clientId ? { id, clientId } : { id };
}

async function findDevice(req: Request) {
  const device = await db.device.findFirst({
    where: deviceWhere(req, req.params.id),
    include: { agent: true, client: true, site: true, installedSoftware: true },
  });
  if (!device) throw new AppError(404, "Device not found");
  return device;
}

export async function queueCheckNow(req: Request, res: Response) {
  const device = await findDevice(req);
  const task = await db.agentTask.create({
    data: {
      agentId: device.agent?.agentId,
      deviceId: device.id,
      type: "CHECK_IN_NOW",
      createdById: req.user?.id,
    },
  });

  await writeAuditLog(req, "CREATE", "agent-tasks", `Queued CHECK_IN_NOW for device ${device.id}`);
  return res.status(202).json(jsonSafe({
    message: "Check request queued",
    taskId: task.id,
    device: withDerivedDeviceStatus(device),
  }));
}

export async function listDeviceServices(req: Request, res: Response) {
  const device = await findDevice(req);
  const services = await db.deviceService.findMany({
    where: { deviceId: device.id },
    orderBy: [{ status: "asc" }, { serviceName: "asc" }],
  });
  return res.json(jsonSafe(services));
}

export async function listDeviceProcesses(req: Request, res: Response) {
  const device = await findDevice(req);
  const processes = await db.deviceProcess.findMany({
    where: { deviceId: device.id },
    orderBy: [{ processName: "asc" }],
  });
  return res.json(jsonSafe(processes));
}
