import { Router } from "express";
import {
  agentHeartbeat,
  agentInventory,
  agentUninstall,
  listAgentTasks,
  registerAgent,
  updateAgentTaskResult,
} from "../controllers/agent.controller";

export const agentRoutes = Router();

agentRoutes.post("/register", registerAgent);
agentRoutes.post("/heartbeat", agentHeartbeat);
agentRoutes.post("/inventory", agentInventory);
agentRoutes.post("/uninstall", agentUninstall);
agentRoutes.get("/tasks", listAgentTasks);
agentRoutes.post("/tasks/:id/result", updateAgentTaskResult);
