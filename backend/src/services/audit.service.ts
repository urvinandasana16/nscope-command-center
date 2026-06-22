import type { Request } from "express";
import { prisma } from "../prisma/client";

export async function writeAuditLog(req: Request, action: string, module: string, description: string) {
  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action,
      module,
      description,
      ipAddress: req.ip,
    },
  });
}
