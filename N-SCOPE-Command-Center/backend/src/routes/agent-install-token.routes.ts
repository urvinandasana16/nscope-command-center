import { Router } from "express";
import {
  createAgentInstallToken,
  downloadWindowsAgentForToken,
  listAgentInstallTokens,
  revokeAgentInstallToken,
} from "../controllers/agent-install-token.controller";

export const agentInstallTokenRoutes = Router();

agentInstallTokenRoutes.get("/", listAgentInstallTokens);
agentInstallTokenRoutes.post("/", createAgentInstallToken);
agentInstallTokenRoutes.get("/:id/download/windows", downloadWindowsAgentForToken);
agentInstallTokenRoutes.post("/:id/revoke", revokeAgentInstallToken);
