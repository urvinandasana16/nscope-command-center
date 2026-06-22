"use client";

import { useEffect, useState } from "react";
import { FolderOpen, MonitorUp, RefreshCw, Terminal } from "lucide-react";
import { checkDeviceNow, getDevice, listDeviceProcesses, listDeviceServices } from "@/services/deviceService";
import { compactOs, deriveDeviceStatus, displayStatus, formatBytes, parseWindowsOs } from "@/lib/device-format";
import { getDeviceRemoteControl, getRemoteControlStatus, type RemoteControlStatus } from "@/services/remoteControlService";
import { Badge, Button, Card, DataTable, PageHeader } from "./ui/primitives";

type SoftwareRecord = {
  id?: string;
  name: string;
  version?: string | null;
  publisher?: string | null;
  installDate?: string | null;
  source?: string | null;
};

type ServiceRecord = {
  id?: string;
  serviceName: string;
  displayName?: string | null;
  status: string;
  startType?: string | null;
  accountName?: string | null;
  pathName?: string | null;
};

type ProcessRecord = {
  id?: string;
  pid: number;
  processName: string;
  executablePath?: string | null;
  username?: string | null;
  cpuUsage?: number | null;
  memoryBytes?: number | string | null;
};

type DeviceDetail = {
  id: string;
  hostname: string;
  clientId: string;
  siteId: string;
  client?: { name?: string };
  site?: { name?: string };
  os: string;
  osName?: string | null;
  osVersion?: string | null;
  osBuild?: string | null;
  ipAddress: string;
  macAddress: string;
  status: string;
  derivedStatus?: string | null;
  lastSeen?: string | null;
  lastUninstalledAt?: string | null;
  agentVersion?: string | null;
  assignedUser?: string | null;
  deviceType?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  biosSerialNumber?: string | null;
  motherboardSerialNumber?: string | null;
  cpu?: string | null;
  cpuCores?: number | null;
  ramBytes?: number | string | null;
  diskBytes?: number | string | null;
  diskFreeBytes?: number | string | null;
  diskModel?: string | null;
  remoteConsentRequired?: boolean;
  meshNodeId?: string | null;
  agent?: { meshNodeId?: string | null; meshGroupId?: string | null; status?: string | null; version?: string | null };
  installedSoftware?: SoftwareRecord[];
};

const tabs = ["Overview", "Hardware", "Software", "Services", "Processes", "Patches", "Event Logs", "Tasks", "Tickets", "Remote Control"];

export function LiveDeviceDetailPage({ deviceId }: { deviceId: string }) {
  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [remoteStatus, setRemoteStatus] = useState<RemoteControlStatus | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [processes, setProcesses] = useState<ProcessRecord[]>([]);
  const [serviceFilter, setServiceFilter] = useState("All");
  const [serviceSearch, setServiceSearch] = useState("");
  const [processSearch, setProcessSearch] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState("Loading device...");

  async function load() {
    try {
      const [deviceData, remoteData, serviceData, processData] = await Promise.all([
        getDevice(deviceId),
        getRemoteControlStatus().catch(() => null),
        listDeviceServices(deviceId).catch(() => []),
        listDeviceProcesses(deviceId).catch(() => []),
      ]);
      setDevice(deviceData as DeviceDetail);
      setRemoteStatus(remoteData);
      setServices(serviceData as ServiceRecord[]);
      setProcesses(processData as ProcessRecord[]);
      setStatus("Device data loaded.");
    } catch (error) {
      setDevice(null);
      setRemoteStatus(null);
      setServices([]);
      setProcesses([]);
      setStatus(error instanceof Error ? error.message : "Unable to load device.");
    }
  }

  useEffect(() => {
    load();
  }, [deviceId]);

  async function openRemote(mode: "desktop" | "terminal" | "files") {
    if (!device) return;
    try {
      const remote = await getDeviceRemoteControl(device.id);
      if (!remote.configured || !remote.remoteControlEnabled) {
        setStatus(remote.message ?? "Remote control is unavailable for this device.");
        return;
      }
      const url = mode === "terminal" ? remote.terminalUrl : mode === "files" ? remote.fileManagerUrl : remote.remoteUrl;
      if (!url) {
        setStatus("Remote control URL is unavailable for this action.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      setStatus("Opening MeshCentral remote session.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to open remote control session.");
    }
  }

  async function requestCheckNow() {
    if (!device) return;
    setIsChecking(true);
    try {
      await checkDeviceNow(device.id);
      setStatus("Check request queued");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to queue check request.");
    } finally {
      setIsChecking(false);
    }
  }

  if (!device) {
    return (
      <>
        <PageHeader title="Device Details" description={status} action={<Button onClick={load}><RefreshCw className="h-4 w-4" /> Retry</Button>} />
        <Card className="text-sm text-slate-500 dark:text-slate-400">{status}</Card>
      </>
    );
  }

  const meshLinked = Boolean(device.meshNodeId ?? device.agent?.meshNodeId);
  const remoteDisabled = !remoteStatus?.configured || !meshLinked;
  const remoteReason = !remoteStatus?.configured ? "Remote control not configured" : !meshLinked ? "Mesh agent not linked" : undefined;
  const parsedOs = parseWindowsOs(device.os);
  const osInfo = {
    name: device.osName ?? parsedOs.name,
    version: device.osVersion ?? parsedOs.version,
    build: device.osBuild ?? parsedOs.build,
  };
  const effectiveStatus = deriveDeviceStatus(device);
  const filteredServices = services.filter((service) => {
    const matchesFilter = serviceFilter === "All" || service.status.toLowerCase() === serviceFilter.toLowerCase();
    const query = serviceSearch.toLowerCase();
    const matchesSearch = !query || [service.serviceName, service.displayName, service.status, service.startType, service.accountName, service.pathName].some((value) => (value ?? "").toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  });
  const filteredProcesses = processes.filter((process) => {
    const query = processSearch.toLowerCase();
    return !query || [String(process.pid), process.processName, process.username, process.executablePath].some((value) => (value ?? "").toLowerCase().includes(query));
  });

  return (
    <>
      <PageHeader
        title={device.hostname}
        description={`${device.client?.name ?? "Unknown Client"} / ${device.site?.name ?? "Unknown Site"} / ${compactOs(device.os, device.osName)}`}
        action={<div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={isChecking} onClick={requestCheckNow}>{isChecking ? "Requesting..." : "Check Now"}</Button><Button onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button></div>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Metric label="Status" value={<Badge>{displayStatus(effectiveStatus)}</Badge>} />
        <Metric label="IP Address" value={device.ipAddress || "-"} />
        <Metric label="Last Seen" value={formatDate(device.lastSeen)} />
        <Metric label="Agent Version" value={device.agentVersion ?? device.agent?.version ?? "-"} />
      </div>

      <Card className="mb-4 p-2">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <Button key={tab} size="sm" variant={activeTab === tab ? "default" : "ghost"} onClick={() => setActiveTab(tab)}>
              {tab}
            </Button>
          ))}
        </div>
      </Card>

      {activeTab === "Overview" && (
        <Card>
          <h2 className="mb-3 text-base font-semibold">Overview</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <Line label="Client" value={device.client?.name ?? "-"} />
            <Line label="Site" value={device.site?.name ?? "-"} />
            <Line label="Assigned User" value={device.assignedUser ?? "-"} />
            <Line label="Operating System" value={osInfo.name} />
            <Line label="Version" value={osInfo.version ?? "Not detected"} />
            <Line label="Build" value={osInfo.build ?? "Not detected"} />
            <Line label="Device Type" value={device.deviceType ?? "-"} />
            <Line label="Serial Number" value={device.serialNumber ?? "Not detected"} />
            <Line label="MAC Address" value={device.macAddress || "-"} />
            <Line label="Mesh Node" value={device.meshNodeId ?? device.agent?.meshNodeId ?? "Mesh agent not linked"} />
            <Line label="Agent Status" value={device.agent?.status ?? device.status} />
          </div>
        </Card>
      )}

      {activeTab === "Hardware" && (
        <Card>
          <h2 className="mb-3 text-base font-semibold">Hardware</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <Line label="Manufacturer" value={device.manufacturer ?? "-"} />
            <Line label="Model" value={device.model ?? "-"} />
            <Line label="Serial Number" value={device.serialNumber ?? "Not detected"} />
            <Line label="BIOS Serial" value={device.biosSerialNumber ?? device.serialNumber ?? "Not detected"} />
            <Line label="Motherboard Serial" value={device.motherboardSerialNumber ?? "Not detected"} />
            <Line label="CPU" value={device.cpu ?? "Not detected"} />
            <Line label="CPU Cores" value={device.cpuCores === undefined || device.cpuCores === null ? "Not detected" : String(device.cpuCores)} />
            <Line label="RAM" value={formatBytes(device.ramBytes)} />
            <Line label="Disk" value={device.diskModel ? `${device.diskModel} / ${formatBytes(device.diskBytes)} total / ${formatBytes(device.diskFreeBytes)} free` : `${formatBytes(device.diskBytes)} total / ${formatBytes(device.diskFreeBytes)} free`} />
            <Line label="OS Version" value={osInfo.version ?? "Not detected"} />
            <Line label="OS Build" value={osInfo.build ?? "Not detected"} />
          </div>
        </Card>
      )}

      {activeTab === "Services" && (
        <Card>
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-base font-semibold">Services</h2>
            <div className="flex flex-wrap gap-2">
              <input className="h-8 rounded-md border bg-white px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950" placeholder="Search services" value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} />
              <select className="h-8 rounded-md border bg-white px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950" value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
                <option>All</option>
                <option>Running</option>
                <option>Stopped</option>
              </select>
            </div>
          </div>
          <DataTable
            columns={["Status", "Name", "Display Name", "Start Type", "Account", "Path"]}
            emptyMessage="No services inventory received yet."
            rows={filteredServices.map((service) => [
              <Badge key="status">{displayStatus(service.status)}</Badge>,
              service.serviceName,
              service.displayName ?? "-",
              service.startType ?? "-",
              service.accountName ?? "-",
              service.pathName ?? "-",
            ])}
          />
        </Card>
      )}

      {activeTab === "Processes" && (
        <Card>
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-base font-semibold">Processes</h2>
            <input className="h-8 rounded-md border bg-white px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950" placeholder="Search processes" value={processSearch} onChange={(event) => setProcessSearch(event.target.value)} />
          </div>
          <DataTable
            columns={["PID", "Name", "User", "Memory", "CPU", "Path"]}
            emptyMessage="No process inventory received yet."
            rows={filteredProcesses.map((process) => [
              String(process.pid),
              process.processName,
              process.username ?? "-",
              formatBytes(process.memoryBytes),
              process.cpuUsage === undefined || process.cpuUsage === null ? "-" : `${process.cpuUsage.toFixed(2)}%`,
              process.executablePath ?? "-",
            ])}
          />
        </Card>
      )}

      {activeTab === "Software" && (
        <Card>
          <h2 className="mb-3 text-base font-semibold">Installed Software</h2>
          <DataTable
            columns={["Name", "Version", "Publisher", "Install Date", "Source"]}
            emptyMessage="No installed software inventory received yet."
            rows={(device.installedSoftware ?? []).map((item) => [
              item.name,
              item.version ?? "-",
              item.publisher ?? "-",
              item.installDate ?? "-",
              item.source ?? "-",
            ])}
          />
        </Card>
      )}

      {activeTab === "Remote Control" && (
        <Card>
          <h2 className="mb-3 text-base font-semibold">Remote Control</h2>
          <div className="mb-3 grid gap-3 md:grid-cols-3">
            <Line label="MeshCentral" value={remoteStatus?.configured ? "Configured" : "Not configured"} />
            <Line label="Consent Required" value={device.remoteConsentRequired ? "Yes" : "No"} />
            <Line label="Policy" value={device.remoteConsentRequired ? "User consent required on workstation" : "Server remote control allowed"} />
          </div>
          <div className="flex flex-wrap gap-2">
            <span title={remoteDisabled ? remoteReason : undefined}>
              <Button disabled={remoteDisabled} onClick={() => openRemote("desktop")}><MonitorUp className="h-4 w-4" /> Take Control</Button>
            </span>
            <span title={remoteDisabled ? remoteReason : undefined}>
              <Button disabled={remoteDisabled} variant="secondary" onClick={() => openRemote("terminal")}><Terminal className="h-4 w-4" /> Remote Terminal</Button>
            </span>
            <span title={remoteDisabled ? remoteReason : undefined}>
              <Button disabled={remoteDisabled} variant="secondary" onClick={() => openRemote("files")}><FolderOpen className="h-4 w-4" /> File Manager</Button>
            </span>
          </div>
          {remoteReason && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{remoteReason}</p>}
        </Card>
      )}

      {!["Overview", "Hardware", "Software", "Services", "Processes", "Remote Control"].includes(activeTab) && (
        <Card>
          <h2 className="mb-2 text-base font-semibold">{activeTab}</h2>
          <div className="rounded-md border border-dashed px-3 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Coming soon.
          </div>
        </Card>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="p-3">
      <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{value}</div>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2 dark:border-slate-800">
      <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}
