import { Router } from "express";
import { linkDeviceMeshNode, getDeviceRemoteControl, remoteControlStatus } from "../controllers/remote-control.controller";
import { requireRoles } from "../middleware/roles.middleware";

export const remoteControlRoutes = Router();

remoteControlRoutes.get("/remote-control/status", remoteControlStatus);
remoteControlRoutes.get("/devices/:id/remote-control", getDeviceRemoteControl);
remoteControlRoutes.post(
  "/devices/:id/mesh-node",
  requireRoles("SUPER_ADMIN", "NOC_ENGINEER", "SUPPORT_ENGINEER"),
  linkDeviceMeshNode,
);
