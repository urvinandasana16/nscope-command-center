import type { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { writeAuditLog } from "../services/audit.service";
import { getClientScope } from "../middleware/roles.middleware";
import { deriveDeviceStatus, withDerivedDeviceStatus } from "../utils/device-status";
import { AppError, toDate } from "../utils/http";
import { jsonSafe } from "../utils/json-safe";

type ModelName = "client" | "site" | "device" | "asset" | "ticket";

type CrudConfig = {
  model: ModelName;
  module: string;
  validator: { parse: (value: unknown) => Record<string, unknown> };
  include?: Record<string, unknown>;
  scopedByClient?: boolean;
};

function delegate(model: ModelName) {
  return prisma[model] as any;
}

function normalizeDates(data: Record<string, unknown>): Record<string, any> {
  return {
    ...data,
    lastSeen: toDate(data.lastSeen),
    purchaseDate: toDate(data.purchaseDate),
    warrantyExpiry: toDate(data.warrantyExpiry),
    slaDue: toDate(data.slaDue),
  };
}

function scopedWhere(req: Request, base: Record<string, unknown> = {}) {
  const clientId = getClientScope(req);
  return clientId ? { ...base, clientId } : base;
}

export function createCrudController(config: CrudConfig) {
  const model = delegate(config.model);

  return {
    async list(req: Request, res: Response) {
      const where = config.scopedByClient ? scopedWhere(req) : {};
      const rows = await model.findMany({
        where,
        include: config.include,
        orderBy: { createdAt: "desc" },
      });
      return res.json(jsonSafe(config.model === "device" ? rows.map((row: any) => withDerivedDeviceStatus(row)) : rows));
    },

    async get(req: Request, res: Response) {
      const where = config.scopedByClient ? scopedWhere(req, { id: req.params.id }) : { id: req.params.id };
      const row = await model.findFirst({ where, include: config.include });
      if (!row) throw new AppError(404, `${config.module} not found`);
      return res.json(jsonSafe(config.model === "device" ? withDerivedDeviceStatus(row) : row));
    },

    async create(req: Request, res: Response) {
      const parsed = normalizeDates(config.validator.parse(req.body));
      const clientId = getClientScope(req);
      if (clientId && parsed.clientId && parsed.clientId !== clientId) {
        throw new AppError(403, "Cannot create records for another client");
      }

      const data = { ...parsed };
      if (config.model === "ticket" && !data.ticketNumber) {
        data.ticketNumber = `NSC-${Date.now().toString().slice(-6)}`;
      }
      if (config.model === "ticket") {
        data.createdById = req.user?.id;
      }

      const row = await model.create({ data });
      await writeAuditLog(req, "CREATE", config.module, `Created ${config.module} ${row.id}`);
      return res.status(201).json(row);
    },

    async update(req: Request, res: Response) {
      const parsed = normalizeDates(config.validator.parse(req.body));
      const existing = await model.findFirst({
        where: config.scopedByClient ? scopedWhere(req, { id: req.params.id }) : { id: req.params.id },
      });
      if (!existing) throw new AppError(404, `${config.module} not found`);

      const row = await model.update({
        where: { id: req.params.id },
        data: parsed,
      });
      await writeAuditLog(req, "UPDATE", config.module, `Updated ${config.module} ${row.id}`);
      return res.json(row);
    },

    async remove(req: Request, res: Response) {
      const existing = await model.findFirst({
        where: config.scopedByClient ? scopedWhere(req, { id: req.params.id }) : { id: req.params.id },
      });
      if (!existing) throw new AppError(404, `${config.module} not found`);

      await model.delete({ where: { id: req.params.id } });
      await writeAuditLog(req, "DELETE", config.module, `Deleted ${config.module} ${req.params.id}`);
      return res.status(204).send();
    },
  };
}

export async function createTicketComment(req: Request, res: Response) {
  const ticket = await prisma.ticket.findFirst({
    where: scopedWhere(req, { id: req.params.id }),
  });
  if (!ticket) throw new AppError(404, "Ticket not found");

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId: req.params.id,
      userId: req.user!.id,
      comment: String(req.body.comment),
    },
  });

  await writeAuditLog(req, "CREATE", "tickets", `Added comment to ticket ${ticket.ticketNumber}`);
  return res.status(201).json(comment);
}

export async function dashboardSummary(req: Request, res: Response) {
  const clientWhere = getClientScope(req) ? { id: getClientScope(req) } : {};
  const relationWhere = getClientScope(req) ? { clientId: getClientScope(req) } : {};

  const [
    totalClients,
    totalSites,
    devices,
    openTickets,
    criticalTickets,
    totalAssets,
  ] = await prisma.$transaction([
    prisma.client.count({ where: clientWhere }),
    prisma.site.count({ where: relationWhere }),
    (prisma.device as any).findMany({ where: relationWhere, select: { status: true, lastSeen: true, lastUninstalledAt: true } }),
    prisma.ticket.count({ where: { ...relationWhere, status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.ticket.count({ where: { ...relationWhere, priority: "CRITICAL", status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    prisma.asset.count({ where: relationWhere }),
  ]);
  const now = new Date();
  const statusCounts = devices.reduce((counts: Record<string, number>, device: any) => {
    const status = deriveDeviceStatus(device, now);
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});

  return res.json({
    total_clients: totalClients,
    total_sites: totalSites,
    total_devices: devices.length,
    online_devices: statusCounts.ONLINE ?? 0,
    offline_devices: statusCounts.OFFLINE ?? 0,
    stale_devices: statusCounts.STALE ?? 0,
    warning_devices: statusCounts.STALE ?? 0,
    critical_devices: statusCounts.CRITICAL ?? 0,
    open_tickets: openTickets,
    critical_tickets: criticalTickets,
    total_assets: totalAssets,
  });
}
