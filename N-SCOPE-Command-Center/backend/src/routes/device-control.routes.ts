import { Router } from "express";
import { listDeviceProcesses, listDeviceServices, queueCheckNow } from "../controllers/device-control.controller";
import { requireRoles } from "../middleware/roles.middleware";

export const deviceControlRoutes = Router();

deviceControlRoutes.post(
  "/devices/:id/check-now",
  requireRoles("SUPER_ADMIN", "NOC_ENGINEER", "SUPPORT_ENGINEER", "CLIENT_ADMIN"),
  queueCheckNow,
);
deviceControlRoutes.get("/devices/:id/services", listDeviceServices);
deviceControlRoutes.get("/devices/:id/processes", listDeviceProcesses);
