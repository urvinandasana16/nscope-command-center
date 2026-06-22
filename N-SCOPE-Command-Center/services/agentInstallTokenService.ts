import { apiRequest } from "@/lib/api";

export type AgentInstallTokenCreatePayload = {
  clientId: string;
  siteId: string;
  os: "WINDOWS";
  agentType: "MODERN_WINDOWS" | "LEGACY_WINDOWS";
  deviceType: "Workstation" | "Server";
  expiresInHours: number;
  maxUses: number;
};

export type AgentInstallTokenRecord = {
  id: string;
  clientId: string;
  siteId: string;
  client?: { id: string; name: string };
  site?: { id: string; name: string };
  os: string;
  agentType: string;
  deviceType: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  isRevoked: boolean;
  createdAt: string;
};

export type AgentInstallTokenCreateResult = AgentInstallTokenRecord & {
  rawToken: string;
  installCommand: string;
  downloadUrl: string;
};

export type AgentInstallerConfig = {
  agentPublicApiUrl: string;
  frontendPublicUrl: string;
};

export async function listAgentInstallTokens() {
  return apiRequest<AgentInstallTokenRecord[]>("/agent-install-tokens");
}

export async function getAgentInstallerConfig() {
  return apiRequest<AgentInstallerConfig>("/agent-installers/config");
}

export async function createAgentInstallToken(data: AgentInstallTokenCreatePayload) {
  return apiRequest<AgentInstallTokenCreateResult>("/agent-install-tokens", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function revokeAgentInstallToken(id: string) {
  return apiRequest<AgentInstallTokenRecord>(`/agent-install-tokens/${id}/revoke`, {
    method: "POST",
  });
}
