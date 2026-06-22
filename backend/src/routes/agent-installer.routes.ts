import { Router } from "express";
import { agentInstallerConfig, downloadLatestWindowsInstaller } from "../controllers/agent-installer.controller";

export const agentInstallerRoutes = Router();

agentInstallerRoutes.get("/config", agentInstallerConfig);
agentInstallerRoutes.get("/windows/latest", downloadLatestWindowsInstaller);
