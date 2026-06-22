import { Router } from "express";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createCrudController, createTicketComment, dashboardSummary } from "../controllers/crud.controller";
import { authenticate } from "../middleware/auth.middleware";
import { canAccessAllClients, requireRoles } from "../middleware/roles.middleware";
import { prisma } from "../prisma/client";
import { agentInstallTokenRoutes } from "./agent-install-token.routes";
import { deviceControlRoutes } from "./device-control.routes";
import { remoteControlRoutes } from "./remote-control.routes";
import { assetSchema, clientSchema, deviceSchema, siteSchema, ticketSchema, userCreateSchema } from "../validators/common";
import { writeAuditLog } from "../services/audit.service";

const writeRoles: UserRole[] = ["SUPER_ADMIN", "NOC_ENGINEER", "SUPPORT_ENGINEER", "CLIENT_ADMIN"];
const adminOnly: UserRole[] = ["SUPER_ADMIN"];

function crudRoutes(controller: ReturnType<typeof createCrudController>, deleteRoles = writeRoles, mutateRoles = writeRoles) {
  const router = Router();

  router.get("/", controller.list);
  router.get("/:id", controller.get);
  router.post("/", requireRoles(...mutateRoles), controller.create);
  router.put("/:id", requireRoles(...mutateRoles), controller.update);
  router.delete("/:id", requireRoles(...deleteRoles), controller.remove);

  return router;
}

export const apiRoutes = Router();

apiRoutes.use(authenticate);

apiRoutes.use(remoteControlRoutes);
apiRoutes.use(deviceControlRoutes);
apiRoutes.get("/dashboard/summary", dashboardSummary);
apiRoutes.use("/agent-install-tokens", agentInstallTokenRoutes);
apiRoutes.get("/users", requireRoles("SUPER_ADMIN"), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, clientId: true, status: true, lastLogin: true, client: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

apiRoutes.post("/users", requireRoles("SUPER_ADMIN"), async (req, res) => {
  const payload = userCreateSchema.parse(req.body);
  if (payload.role.startsWith("CLIENT") && !payload.clientId) {
    return res.status(422).json({ message: "Client portal users must be linked to a client." });
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: payload.role,
      clientId: payload.clientId ?? null,
      status: payload.status ?? "ACTIVE",
    },
    select: { id: true, name: true, email: true, role: true, clientId: true, status: true, client: true },
  });
  await writeAuditLog(req, "CREATE", "users", `Created ${payload.role} login ${payload.email}`);
  res.status(201).json(user);
});

apiRoutes.get("/audit-logs", requireRoles("SUPER_ADMIN", "NOC_ENGINEER", "SUPPORT_ENGINEER"), async (req, res) => {
  const where = canAccessAllClients(req.user!.role) ? {} : { userId: req.user!.id };
  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(logs);
});

apiRoutes.use(
  "/clients",
  crudRoutes(
    createCrudController({
      model: "client",
      module: "clients",
      validator: clientSchema,
      scopedByClient: false,
    }),
    adminOnly,
    adminOnly
  )
);

apiRoutes.use(
  "/sites",
  crudRoutes(
    createCrudController({
      model: "site",
      module: "sites",
      validator: siteSchema,
      scopedByClient: true,
      include: { client: true },
    })
  )
);

apiRoutes.use(
  "/devices",
  crudRoutes(
    createCrudController({
      model: "device",
      module: "devices",
      validator: deviceSchema,
      scopedByClient: true,
      include: { client: true, site: true, agent: true, installedSoftware: true },
    })
  )
);

apiRoutes.use(
  "/assets",
  crudRoutes(
    createCrudController({
      model: "asset",
      module: "assets",
      validator: assetSchema,
      scopedByClient: true,
      include: { client: true, site: true, device: true },
    })
  )
);

const ticketController = createCrudController({
  model: "ticket",
  module: "tickets",
  validator: ticketSchema,
  scopedByClient: true,
  include: {
    client: true,
    site: true,
    device: true,
    asset: true,
    assignedEngineer: { select: { id: true, name: true, email: true, role: true } },
    comments: true,
  },
});

apiRoutes.use("/tickets", crudRoutes(ticketController));
apiRoutes.post("/tickets/:id/comments", requireRoles(...writeRoles), createTicketComment);
