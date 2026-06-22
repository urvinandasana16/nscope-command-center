import type { Request, Response } from "express";
import { z } from "zod";
import { getClientScope } from "../middleware/roles.middleware";
import { prisma } from "../prisma/client";
import { getDeviceRemoteUrl, getMeshStatus, syncMeshNode } from "../services/meshcentral.service";
import { writeAuditLog } from "../services/audit.service";
import { AppError } from "../utils/http";

const db = prisma as any;

const meshNodeSchema = z.object({
  meshNodeId: z.string().min(1),
});

function deviceWhere(req: Request, id: string) {
  const clientId = getClientScope(req);
  return clientId ? { id, clientId } : { id };
}

async function findDevice(req: Request) {
  const device = await db.device.findFirst({
    where: deviceWhere(req, req.params.id),
    include: { agent: true, client: true, site: true },
  });
  if (!device) throw new AppError(404, "Device not found");
  return device;
}

export async function remoteControlStatus(_req: Request, res: Response) {
  return res.json(getMeshStatus());
}

export async function getDeviceRemoteControl(req: Request, res: Response) {
  const device = await findDevice(req);
  const meshNodeId = device.meshNodeId ?? device.agent?.meshNodeId;

  if (!meshNodeId) {
    return res.json({
    configured: getMeshStatus().configured,
    remoteControlEnabled: false,
    remoteConsentRequired: Boolean(device.remoteConsentRequired),
    consentMessage: device.remoteConsentRequired ? "User consent required on workstation" : "Server remote control allowed",
    message: "Remote control not linked yet",
    });
  }

  const remote = getDeviceRemoteUrl(meshNodeId);
  if (!remote.configured) {
    return res.json(remote);
  }

  return res.json({
    ...remote,
    remoteControlEnabled: true,
    remoteConsentRequired: Boolean(device.remoteConsentRequired),
    consentMessage: device.remoteConsentRequired ? "User consent required on workstation" : "Server remote control allowed",
    deviceId: device.id,
    hostname: device.hostname,
  });
}

export async function linkDeviceMeshNode(req: Request, res: Response) {
  const device = await findDevice(req);
  const payload = meshNodeSchema.parse(req.body);
  const linked = await syncMeshNode(device.id, payload.meshNodeId);

  await writeAuditLog(req, "UPDATE", "devices", `Linked MeshCentral node for device ${device.id}`);
  return res.json(linked);
}
