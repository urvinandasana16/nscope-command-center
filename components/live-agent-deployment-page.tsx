"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Copy, Download, Globe2, Network, RefreshCw } from "lucide-react";
import { API_BASE_URL, getStoredToken } from "@/lib/api";
import { listClients } from "@/services/clientService";
import { listSites } from "@/services/siteService";
import {
  createAgentInstallToken,
  getAgentInstallerConfig,
  listAgentInstallTokens,
  revokeAgentInstallToken,
  type AgentInstallerConfig,
  type AgentInstallTokenCreatePayload,
  type AgentInstallTokenCreateResult,
  type AgentInstallTokenRecord,
} from "@/services/agentInstallTokenService";
import { Badge, Button, Card, DataTable, Field, Input, PageHeader, Select } from "./ui/primitives";

type ClientRecord = {
  id: string;
  name: string;
};

type SiteRecord = {
  id: string;
  clientId: string;
  name: string;
};

type DeploymentMode = "local" | "public";

export function LiveAgentDeploymentPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [tokens, setTokens] = useState<AgentInstallTokenRecord[]>([]);
  const [generated, setGenerated] = useState<AgentInstallTokenCreateResult | null>(null);
  const [installerConfig, setInstallerConfig] = useState<AgentInstallerConfig | null>(null);
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>("local");
  const [status, setStatus] = useState("Loading agent deployment data...");
  const [baseStatus, setBaseStatus] = useState("Checking Windows agent base binary...");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState<AgentInstallTokenCreatePayload>({
    clientId: "",
    siteId: "",
    os: "WINDOWS",
    agentType: "MODERN_WINDOWS",
    deviceType: "Workstation",
    expiresInHours: 24,
    maxUses: 1,
  });

  const filteredSites = useMemo(
    () => sites.filter((site) => site.clientId === form.clientId),
    [sites, form.clientId],
  );
  const selectedClient = clients.find((client) => client.id === form.clientId);
  const selectedSite = sites.find((site) => site.id === form.siteId);
  const backendAgentUrl = installerConfig?.agentPublicApiUrl || "Unavailable";
  const selectedModeUrl = deploymentMode === "public" ? backendAgentUrl : API_BASE_URL || backendAgentUrl;
  const embeddedServerUrl = backendAgentUrl;

  async function load() {
    try {
      const [clientData, siteData, tokenData] = await Promise.all([
        listClients(),
        listSites(),
        listAgentInstallTokens(),
      ]);
      const configData = await getAgentInstallerConfig().catch(() => null);
      const nextClients = normalizeClients(clientData as unknown[]);
      const nextSites = normalizeSites(siteData as unknown[]);
      setClients(nextClients);
      setSites(nextSites);
      setTokens(tokenData);
      setInstallerConfig(configData);
      checkBaseBinary();
      setForm((current) => {
        const clientId = current.clientId || nextClients[0]?.id || "";
        const siteId = current.siteId || nextSites.find((site) => site.clientId === clientId)?.id || "";
        return { ...current, clientId, siteId };
      });
      setStatus("Connected to live agent deployment APIs.");
    } catch (error) {
      setClients([]);
      setSites([]);
      setTokens([]);
      setInstallerConfig(null);
      setStatus(error instanceof Error ? error.message : "Unable to load agent deployment data from the backend.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function checkBaseBinary() {
    if (!API_BASE_URL) {
      setBaseStatus("Base Windows agent status unavailable because NEXT_PUBLIC_API_URL is not configured.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/agent-installers/windows/latest`, {
        method: "HEAD",
        headers: {
          ...(getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {}),
        },
      });
      if (response.ok) {
        setBaseStatus("Windows Agent Base Binary: Available");
        return;
      }
      setBaseStatus("Base Windows agent is not built yet. Build it on server first.");
    } catch {
      setBaseStatus("Unable to check Windows agent base binary.");
    }
  }

  useEffect(() => {
    if (!form.clientId) return;
    if (filteredSites.some((site) => site.id === form.siteId)) return;
    setForm((current) => ({
      ...current,
      siteId: filteredSites[0]?.id ?? "",
    }));
  }, [filteredSites, form.clientId, form.siteId]);

  async function downloadGeneratedAgent() {
    if (!form.clientId || !form.siteId) {
      setStatus("Select a live client and site before downloading the Windows agent.");
      return;
    }

    setIsGenerating(true);
    setGenerated(null);
    try {
      const result = await createAgentInstallToken(form);
      setGenerated(result);
      setTokens((current) => [result, ...current.filter((token) => token.id !== result.id)]);
      await downloadWindowsAgent(result.id, agentFileName());
      setStatus("Windows Agent generated. Run the downloaded EXE as Administrator on the target system.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to generate and download Windows agent.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyCommand() {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.installCommand);
      setStatus("Install command copied.");
    } catch {
      setStatus("Browser clipboard access is unavailable. Select the command text and copy it manually.");
    }
  }

  async function downloadWindowsAgent(tokenId?: string, fileName = "nscope-agent.exe") {
    if (!API_BASE_URL) {
      setStatus("NEXT_PUBLIC_API_URL is not configured, so the installer download URL is unavailable.");
      return;
    }
    if (!tokenId) {
      setStatus("Generate or select an installer token before downloading the Windows agent.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/agent-install-tokens/${tokenId}/download/windows`, {
        headers: {
          ...(getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {}),
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setStatus(payload.message ?? "Generated Windows agent download is unavailable.");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      setStatus("Generated Windows agent download started.");
    } catch {
      setStatus("Unable to download generated Windows agent. Check backend connectivity and base installer storage.");
    }
  }

  function agentFileName() {
    return `nscope-agent-${slug(selectedClient?.name ?? "client")}-${slug(selectedSite?.name ?? "site")}.exe`;
  }

  async function revoke(id: string) {
    try {
      const revoked = await revokeAgentInstallToken(id);
      setTokens((current) => current.map((token) => token.id === id ? revoked : token));
      setStatus("Installer token revoked.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to revoke installer token.");
    }
  }

  return (
    <>
      <PageHeader
        title="Agent Deployment"
        description="Download a client and site specific Windows agent EXE from live database records."
        action={<Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>}
      />

      <Card className="mb-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Deployment Builder</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{status}</p>
          </div>
          <Button onClick={downloadGeneratedAgent} disabled={isGenerating || !clients.length || !filteredSites.length}>
            <Download className="h-4 w-4" />
            {isGenerating ? "Generating" : "Download Windows Agent"}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div className="inline-grid grid-cols-2 rounded-md border bg-slate-50 p-1 dark:bg-slate-900">
            <Button
              type="button"
              variant={deploymentMode === "local" ? "default" : "ghost"}
              onClick={() => setDeploymentMode("local")}
              className="min-w-0"
            >
              <Network className="h-4 w-4" />
              Local LAN
            </Button>
            <Button
              type="button"
              variant={deploymentMode === "public" ? "default" : "ghost"}
              onClick={() => setDeploymentMode("public")}
              className="min-w-0"
            >
              <Globe2 className="h-4 w-4" />
              Public Internet
            </Button>
          </div>
          <div className="grid gap-2 rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300 md:grid-cols-2">
            <div className="min-w-0">
              <span className="block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Selected Mode URL</span>
              <code className="mt-1 block truncate text-xs text-slate-800 dark:text-slate-100">{selectedModeUrl}</code>
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">EXE Embedded URL</span>
              <code className="mt-1 block truncate text-xs text-slate-800 dark:text-slate-100">{embeddedServerUrl}</code>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Client">
            <Select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value, siteId: sites.find((site) => site.clientId === event.target.value)?.id ?? "" })}>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </Select>
          </Field>
          <Field label="Site">
            <Select value={form.siteId} onChange={(event) => setForm({ ...form, siteId: event.target.value })}>
              {filteredSites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </Select>
          </Field>
          <Field label="Device Type">
            <Select value={form.deviceType} onChange={(event) => setForm({ ...form, deviceType: event.target.value as AgentInstallTokenCreatePayload["deviceType"] })}>
              <option value="Workstation">Workstation</option>
              <option value="Server">Server</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4 rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          Selected deployment target: {selectedClient?.name ?? "No client selected"} / {selectedSite?.name ?? "No site selected"}
        </div>
        <div className="mt-3 rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {baseStatus}
        </div>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Run the downloaded EXE as Administrator on the target Windows system. No .NET, Python, or Node.js is required.
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Remote control requires MeshAgent. Coming/Enabled when MeshCentral configured.
        </p>
      </Card>

      {generated && (
        <Card className="mb-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Generated Windows Agent</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Copy the downloaded EXE to the target Windows system, then run it as administrator.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => downloadWindowsAgent(generated.id, agentFileName())}><Download className="h-4 w-4" /> Download Again</Button>
            <Button variant="secondary" onClick={() => setShowAdvanced(!showAdvanced)}>Advanced manual install</Button>
          </div>
        </div>
          {showAdvanced && (
            <>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label="Install Token"><Input readOnly value={generated.rawToken} /></Field>
                <Field label="Expires"><Input readOnly value={formatDate(generated.expiresAt)} /></Field>
                <Field label="Max Uses"><Input readOnly value={`${generated.usedCount} / ${generated.maxUses}`} /></Field>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={copyCommand}><Copy className="h-4 w-4" /> Copy Command</Button>
              </div>
              <code className="mt-4 block overflow-x-auto rounded-md bg-slate-950 px-4 py-3 text-sm text-slate-100">
                {generated.installCommand}
              </code>
            </>
          )}
        </Card>
      )}

      <DataTable
        columns={["Client", "Site", "OS", "Agent Type", "Device Type", "Expiry", "Used / Max", "Status", "Actions"]}
        rows={tokens.map((token) => [
          token.client?.name ?? clients.find((client) => client.id === token.clientId)?.name ?? "-",
          token.site?.name ?? sites.find((site) => site.id === token.siteId)?.name ?? "-",
          displayValue(token.os),
          displayValue(token.agentType),
          token.deviceType,
          formatDate(token.expiresAt),
          `${token.usedCount} / ${token.maxUses}`,
          <Badge key="status">{tokenStatus(token)}</Badge>,
          <div key="actions" className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={token.isRevoked} onClick={() => downloadWindowsAgent(token.id)}>
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
            <Button size="sm" variant="danger" disabled={token.isRevoked} onClick={() => revoke(token.id)}>
              <Ban className="h-3.5 w-3.5" /> Revoke
            </Button>
          </div>,
        ])}
      />
    </>
  );
}

function normalizeClients(data: unknown[]): ClientRecord[] {
  return data.map((item: any) => ({
    id: String(item.id),
    name: item.name ?? "Unnamed Client",
  }));
}

function normalizeSites(data: unknown[]): SiteRecord[] {
  return data.map((item: any) => ({
    id: String(item.id),
    clientId: String(item.clientId),
    name: item.name ?? "Unnamed Site",
  }));
}

function tokenStatus(token: AgentInstallTokenRecord) {
  if (token.isRevoked) return "Revoked";
  if (new Date(token.expiresAt).getTime() <= Date.now()) return "Expired";
  if (token.usedCount >= token.maxUses) return "Used";
  return "Active";
}

function displayValue(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "agent";
}
