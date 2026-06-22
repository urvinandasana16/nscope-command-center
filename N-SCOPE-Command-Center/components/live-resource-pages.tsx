"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderOpen, MessageSquarePlus, MonitorUp, Plus, RefreshCw, Save, ShieldCheck, Terminal, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { compactOs, deriveDeviceStatus, displayStatus as formatDeviceStatus } from "@/lib/device-format";
import { Badge, Button, Card, DataTable, Field, Input, LinkButton, PageHeader, Select, Textarea } from "./ui/primitives";
import { createClient, deleteClient, getClient, listClients, updateClient } from "@/services/clientService";
import { createSite, deleteSite, getSite, listSites, updateSite } from "@/services/siteService";
import { checkDeviceNow, createDevice, deleteDevice, listDevices, updateDevice } from "@/services/deviceService";
import { createAsset, deleteAsset, listAssets, updateAsset } from "@/services/assetService";
import { addTicketComment, createTicket, deleteTicket, listTickets, updateTicket } from "@/services/ticketService";
import { listAuditLogs, type AuditLog } from "@/services/auditService";
import { createUser, listEngineers, listUsers, type EngineerRecord, type UserRecord } from "@/services/userService";
import { getDeviceRemoteControl, getRemoteControlStatus, type RemoteControlStatus } from "@/services/remoteControlService";

type ClientRecord = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  status: string;
  slaPlan: string;
  assignedEngineerId?: string | null;
  assignedEngineerName?: string;
  assignedEngineerEmail?: string;
};

type SiteRecord = {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  location: string;
  networkRange: string;
  status: string;
  assignedEngineerId?: string | null;
  assignedEngineerName?: string;
  assignedEngineerEmail?: string;
};

type DeviceRecord = {
  id: string;
  clientId: string;
  clientName: string;
  siteId: string;
  siteName: string;
  hostname: string;
  os: string;
  osName?: string | null;
  ipAddress: string;
  macAddress: string;
  status: string;
  derivedStatus?: string;
  lastSeen?: string;
  lastUninstalledAt?: string;
  agentVersion?: string;
  assignedUser?: string;
  deviceType: string;
  serialNumber?: string;
  meshNodeId?: string | null;
  remoteControlEnabled?: boolean;
  remoteConsentRequired?: boolean;
  primaryEngineerId?: string | null;
  primaryEngineerName?: string;
};

type AssetRecord = {
  id: string;
  clientId: string;
  clientName: string;
  siteId: string;
  siteName: string;
  deviceId?: string | null;
  deviceName?: string;
  name?: string | null;
  assetTag: string;
  serialNumber: string;
  deviceType: string;
  assignedUser?: string;
  location: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  status: string;
};

type TicketRecord = {
  id: string;
  ticketNumber: string;
  clientId: string;
  clientName: string;
  siteId?: string | null;
  siteName?: string;
  deviceId?: string | null;
  deviceName?: string;
  assetId?: string | null;
  assetName?: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  assignedEngineerName?: string;
  assignedEngineerId?: string | null;
  assignedEngineerEmail?: string;
  slaDue?: string;
  comments?: Array<{ id: string; comment: string; user?: { name: string } }>;
};

const statusOptions = ["HEALTHY", "WARNING", "CRITICAL", "INACTIVE"];
const deviceStatusOptions = ["ONLINE", "OFFLINE", "WARNING", "CRITICAL", "RETIRED"];
const assetStatusOptions = ["ACTIVE", "AT_RISK", "SERVICE_DUE", "RETIRED"];
const priorityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const ticketStatusOptions = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export function LiveClientsPage() {
  const [rows, setRows] = useState<ClientRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [engineers, setEngineers] = useState<EngineerRecord[]>([]);
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [status, setStatus] = useState("Loading clients...");

  async function load() {
    try {
      const [data, userData, engineerData] = await Promise.all([
        listClients(),
        listUsers().catch(() => []),
        listEngineers().catch(() => []),
      ]);
      setRows(normalizeClients(data as unknown[]));
      setUsers(userData);
      setEngineers(engineerData);
      setStatus("Connected to clients API.");
    } catch (error) {
      setRows([]);
      setUsers([]);
      setEngineers([]);
      setStatus(error instanceof Error ? error.message : "Unable to load clients API data.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(payload: ClientRecord) {
    try {
      const saved = editing?.id ? await updateClient(editing.id, payload) : await createClient(payload);
      setRows(upsert(rows, normalizeClient(saved), "id"));
      setStatus("Client saved through API.");
      setEditing(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save client through API.");
    }
  }

  async function remove(row: ClientRecord) {
    try {
      await deleteClient(row.id);
      setStatus("Client deleted through API.");
      setRows(rows.filter((item) => item.id !== row.id));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to delete client through API.");
    }
  }

  async function savePortalUser(payload: { clientId: string; name: string; email: string; password: string; role: "CLIENT_ADMIN" | "CLIENT_VIEWER" }) {
    try {
      const user = await createUser({ ...payload, status: "ACTIVE" });
      setUsers(upsert(users, user, "id"));
      setStatus(`Client login created for ${payload.email}.`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          window.localStorage.removeItem("nscope_token");
          window.localStorage.removeItem("nscope_user");
          setStatus("Session expired. Please sign in again as Super Admin, then create the client login.");
          return;
        }

        if (error.status === 403) {
          setStatus("Only Super Admin can create client logins. Please sign in with the admin account.");
          return;
        }

        setStatus(`Could not create client login: ${error.message}`);
        return;
      }

      setStatus(error instanceof Error ? error.message : `Could not create client login for ${payload.email}.`);
      return;
    }
    setCreatingUser(false);
  }

  return (
    <CrudFrame
      title="Clients"
      description="Add, edit, and delete MSP client records through the frontend service module."
      status={status}
      actionLabel="Add Client"
      onAdd={() => setEditing(blankClient())}
      onRefresh={load}
    >
      {editing && <ClientForm value={editing} engineers={engineers} onCancel={() => setEditing(null)} onSave={save} />}
      {creatingUser && <ClientPortalUserForm clients={rows} onCancel={() => setCreatingUser(false)} onSave={savePortalUser} />}
      <Card className="mb-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Client Portal Logins</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a user and set the password for client-side access.</p>
          </div>
          <Button variant="secondary" onClick={() => setCreatingUser(true)}>Create Client Login</Button>
        </div>
        <div className="mt-4">
          <DataTable
            columns={["Name", "Email", "Client", "Role", "Status"]}
            rows={users.filter((user) => user.role.startsWith("CLIENT")).map((user) => [
              user.name,
              user.email,
              rows.find((client) => client.id === user.clientId)?.name ?? "-",
              displayStatus(user.role),
              <Badge key="status">{displayStatus(user.status ?? "ACTIVE")}</Badge>,
            ])}
          />
        </div>
      </Card>
      <DataTable
        columns={["Client Name", "Contact Person", "Email", "Phone", "Engineer", "SLA Plan", "Status", "Actions"]}
        rows={rows.map((row) => [
          <LinkButton key="client" href={`/clients/${row.id}`} variant="ghost" className="justify-start px-0 text-accent">{row.name}</LinkButton>,
          row.contactPerson,
          row.email,
          row.phone,
          <EngineerBadge key="engineer" name={row.assignedEngineerName} />,
          row.slaPlan,
          <Badge key="status">{displayStatus(row.status)}</Badge>,
          <RowActions key="actions" onEdit={() => setEditing(row)} onDelete={() => remove(row)} />,
        ])}
      />
    </CrudFrame>
  );
}

export function LiveSitesPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [rows, setRows] = useState<SiteRecord[]>([]);
  const [engineers, setEngineers] = useState<EngineerRecord[]>([]);
  const [editing, setEditing] = useState<SiteRecord | null>(null);
  const [status, setStatus] = useState("Loading sites...");

  async function load() {
    try {
      const [clientData, siteData, engineerData] = await Promise.all([listClients(), listSites(), listEngineers().catch(() => [])]);
      const nextClients = normalizeClients(clientData as unknown[]);
      setClients(nextClients);
      setRows(normalizeSites(siteData as unknown[], nextClients));
      setEngineers(engineerData);
      setStatus("Connected to sites API.");
    } catch (error) {
      setClients([]);
      setRows([]);
      setEngineers([]);
      setStatus(error instanceof Error ? error.message : "Unable to load sites API data.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(payload: SiteRecord) {
    const body = toSitePayload(payload);
    try {
      const saved = editing?.id ? await updateSite(editing.id, body) : await createSite(body);
      setRows(upsert(rows, normalizeSite(saved, clients), "id"));
      setStatus("Site saved through API.");
      setEditing(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save site through API.");
    }
  }

  async function remove(row: SiteRecord) {
    try {
      await deleteSite(row.id);
      setStatus("Site deleted through API.");
      setRows(rows.filter((item) => item.id !== row.id));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to delete site through API.");
    }
  }

  return (
    <CrudFrame title="Sites" description="Manage client locations and network ranges." status={status} actionLabel="Add Site" onAdd={() => setEditing(blankSite(clients))} onRefresh={load}>
      {editing && <SiteForm value={editing} clients={clients} engineers={engineers} onCancel={() => setEditing(null)} onSave={save} />}
      <DataTable
        columns={["Site Name", "Client", "Location", "Network Range", "Engineer", "Status", "Actions"]}
        rows={rows.map((row) => [<LinkButton key="site" href={`/sites/${row.id}`} variant="ghost" className="justify-start px-0 text-accent">{row.name}</LinkButton>, row.clientName, row.location, row.networkRange, <EngineerBadge key="engineer" name={row.assignedEngineerName} />, <Badge key="status">{displayStatus(row.status)}</Badge>, <RowActions key="actions" onEdit={() => setEditing(row)} onDelete={() => remove(row)} />])}
      />
    </CrudFrame>
  );
}

export function LiveDevicesPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [rows, setRows] = useState<DeviceRecord[]>([]);
  const [engineers, setEngineers] = useState<EngineerRecord[]>([]);
  const [editing, setEditing] = useState<DeviceRecord | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<RemoteControlStatus | null>(null);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [engineerFilter, setEngineerFilter] = useState("");
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [status, setStatus] = useState("Loading devices...");
  const filteredRows = rows.filter((row) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [row.hostname, row.clientName, row.siteName, row.os, row.ipAddress, row.assignedUser].some((value) => (value ?? "").toLowerCase().includes(query));
    const matchesClient = !clientFilter || row.clientId === clientFilter;
    const matchesSite = !siteFilter || row.siteId === siteFilter;
    const matchesStatus = statusFilter === "ALL" || deriveDeviceStatus(row) === statusFilter;
    const matchesEngineer = !engineerFilter || row.primaryEngineerId === engineerFilter;
    return matchesSearch && matchesClient && matchesSite && matchesStatus && matchesEngineer;
  });
  const filterSites = clientFilter ? sites.filter((site) => site.clientId === clientFilter) : sites;

  async function load() {
    try {
      const [clientData, siteData, deviceData, remoteData, engineerData] = await Promise.all([
        listClients(),
        listSites(),
        listDevices(),
        getRemoteControlStatus().catch(() => null),
        listEngineers().catch(() => []),
      ]);
      const nextClients = normalizeClients(clientData as unknown[]);
      const nextSites = normalizeSites(siteData as unknown[], nextClients);
      setClients(nextClients);
      setSites(nextSites);
      setRows(normalizeDevices(deviceData as unknown[], nextClients, nextSites));
      setRemoteStatus(remoteData);
      setEngineers(engineerData);
      setStatus("Connected to devices API.");
    } catch (error) {
      setClients([]);
      setSites([]);
      setRows([]);
      setRemoteStatus(null);
      setEngineers([]);
      setStatus(error instanceof Error ? error.message : "Unable to load devices API data.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(payload: DeviceRecord) {
    const body = toDevicePayload(payload);
    try {
      const saved = editing?.id ? await updateDevice(editing.id, body) : await createDevice(body);
      setRows(upsert(rows, normalizeDevice(saved, clients, sites), "id"));
      setStatus("Device saved through API.");
      setEditing(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save device through API.");
    }
  }

  async function remove(row: DeviceRecord) {
    try {
      await deleteDevice(row.id);
      setStatus("Device deleted through API.");
      setRows(rows.filter((item) => item.id !== row.id));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to delete device through API.");
    }
  }

  async function openRemote(row: DeviceRecord, mode: "desktop" | "terminal" | "files") {
    try {
      const remote = await getDeviceRemoteControl(row.id);
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

  async function checkNow(row: DeviceRecord) {
    setCheckingId(row.id);
    try {
      await checkDeviceNow(row.id);
      setStatus("Check request queued");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to queue check request.");
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <CrudFrame title="Devices" description="Compact endpoint inventory with remote actions, agent state, and client/site filtering." status={status} actionLabel="Add Device" onAdd={() => setEditing(blankDevice(clients, sites))} onRefresh={load}>
      {editing && <DeviceForm value={editing} clients={clients} sites={sites} onCancel={() => setEditing(null)} onSave={save} />}
      <Card className="mb-4 p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_180px_180px_160px_160px]">
          <Input placeholder="Search hostname, user, IP, OS" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select value={clientFilter} onChange={(event) => { setClientFilter(event.target.value); setSiteFilter(""); }}>
            <option value="">All clients</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </Select>
          <Select value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}>
            <option value="">All sites</option>
            {filterSites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            {["ONLINE", "STALE", "OFFLINE"].map((item) => <option key={item} value={item}>{formatDeviceStatus(item)}</option>)}
          </Select>
          <Select value={engineerFilter} onChange={(event) => setEngineerFilter(event.target.value)}>
            <option value="">All engineers</option>
            {engineers.map((engineer) => <option key={engineer.id} value={engineer.id}>{engineer.name}</option>)}
          </Select>
        </div>
      </Card>
      <DataTable
        columns={["Status", "Hostname", "Client", "Site", "OS", "IP", "User", "Last Seen", "Agent Version", "Actions"]}
        emptyMessage="No devices found. Deploy your first agent."
        rows={filteredRows.map((row) => [
          <Badge key="status">{formatDeviceStatus(deriveDeviceStatus(row))}</Badge>,
          <LinkButton key="device" href={`/devices/${row.id}`} variant="ghost" className="justify-start px-0 text-accent">{row.hostname}</LinkButton>,
          row.clientName,
          row.siteName,
          compactOs(row.os, row.osName),
          row.ipAddress,
          row.assignedUser ?? "-",
          formatDate(row.lastSeen),
          row.agentVersion ?? "-",
          <DeviceTableActions key="actions" row={row} remoteStatus={remoteStatus} checking={checkingId === row.id} onCheck={checkNow} onOpen={openRemote} onEdit={() => setEditing(row)} />,
        ])}
      />
    </CrudFrame>
  );
}

export function LiveClientDetailPage({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [status, setStatus] = useState("Loading client...");

  useEffect(() => {
    getClient(clientId)
      .then((data) => {
        setClient(normalizeClient(data));
        setStatus("Live API data");
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Unable to load client."));
  }, [clientId]);

  return (
    <>
      <PageHeader title={client?.name ?? "Client"} description="Client ownership, contact, service plan, and operational assignment." />
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailValue label="Assigned Engineer" value={client?.assignedEngineerName ?? "Unassigned"} />
          <DetailValue label="Engineer Email" value={client?.assignedEngineerEmail ?? "-"} />
          <DetailValue label="Status" value={client ? displayStatus(client.status) : status} />
          <DetailValue label="Contact" value={client?.contactPerson ?? "-"} />
          <DetailValue label="Email" value={client?.email ?? "-"} />
          <DetailValue label="Phone" value={client?.phone ?? "-"} />
          <DetailValue label="SLA Plan" value={client?.slaPlan ?? "-"} />
          <DetailValue label="Address" value={client?.address ?? "-"} />
        </div>
      </Card>
    </>
  );
}

export function LiveSiteDetailPage({ siteId }: { siteId: string }) {
  const [site, setSite] = useState<SiteRecord | null>(null);
  const [status, setStatus] = useState("Loading site...");

  useEffect(() => {
    Promise.all([getSite(siteId), listClients()])
      .then(([siteData, clientData]) => {
        setSite(normalizeSite(siteData, normalizeClients(clientData as unknown[])));
        setStatus("Live API data");
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Unable to load site."));
  }, [siteId]);

  return (
    <>
      <PageHeader title={site?.name ?? "Site"} description="Site network, client relationship, and primary engineer assignment." />
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailValue label="Assigned Engineer" value={site?.assignedEngineerName ?? "Unassigned"} />
          <DetailValue label="Engineer Email" value={site?.assignedEngineerEmail ?? "-"} />
          <DetailValue label="Client" value={site?.clientName ?? "-"} />
          <DetailValue label="Location" value={site?.location ?? "-"} />
          <DetailValue label="Network Range" value={site?.networkRange ?? "-"} />
          <DetailValue label="Status" value={site ? displayStatus(site.status) : status} />
        </div>
      </Card>
    </>
  );
}

export function LiveAssetsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [rows, setRows] = useState<AssetRecord[]>([]);
  const [editing, setEditing] = useState<AssetRecord | null>(null);
  const [status, setStatus] = useState("Loading assets...");

  async function load() {
    try {
      const [clientData, siteData, deviceData, assetData] = await Promise.all([listClients(), listSites(), listDevices(), listAssets()]);
      const nextClients = normalizeClients(clientData as unknown[]);
      const nextSites = normalizeSites(siteData as unknown[], nextClients);
      const nextDevices = normalizeDevices(deviceData as unknown[], nextClients, nextSites);
      setClients(nextClients);
      setSites(nextSites);
      setDevices(nextDevices);
      setRows(normalizeAssets(assetData as unknown[], nextClients, nextSites, nextDevices));
      setStatus("Connected to assets API.");
    } catch (error) {
      setClients([]);
      setSites([]);
      setDevices([]);
      setRows([]);
      setStatus(error instanceof Error ? error.message : "Unable to load assets API data.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(payload: AssetRecord) {
    const body = toAssetPayload(payload);
    try {
      const saved = editing?.id ? await updateAsset(editing.id, body) : await createAsset(body);
      setRows(upsert(rows, normalizeAsset(saved, clients, sites, devices), "id"));
      setStatus("Asset saved through API.");
      setEditing(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save asset through API.");
    }
  }

  async function remove(row: AssetRecord) {
    try {
      await deleteAsset(row.id);
      setStatus("Asset deleted through API.");
      setRows(rows.filter((item) => item.id !== row.id));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to delete asset through API.");
    }
  }

  return (
    <CrudFrame title="Assets" description="Manage hardware ownership, serials, warranty, and linked devices." status={status} actionLabel="Add Asset" onAdd={() => setEditing(blankAsset(clients, sites, devices))} onRefresh={load}>
      {editing && <AssetForm value={editing} clients={clients} sites={sites} devices={devices} onCancel={() => setEditing(null)} onSave={save} />}
      <DataTable
        columns={["Name", "Asset Tag", "Serial Number", "Linked Device", "Device Type", "Client", "Site", "Assigned User", "Warranty", "Status", "Actions"]}
        emptyMessage="No assets found. Agent inventory and manual assets will appear here."
        rows={rows.map((row) => [row.name ?? "-", row.assetTag, row.serialNumber, row.deviceName ?? "-", row.deviceType, row.clientName, row.siteName, row.assignedUser ?? "-", shortDate(row.warrantyExpiry), <Badge key="status">{displayStatus(row.status)}</Badge>, <RowActions key="actions" onEdit={() => setEditing(row)} onDelete={() => remove(row)} />])}
      />
    </CrudFrame>
  );
}

export function LiveTicketsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [rows, setRows] = useState<TicketRecord[]>([]);
  const [engineers, setEngineers] = useState<EngineerRecord[]>([]);
  const [editing, setEditing] = useState<TicketRecord | null>(null);
  const [commentTicket, setCommentTicket] = useState<TicketRecord | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("Loading tickets...");

  async function load() {
    try {
      const [clientData, siteData, deviceData, assetData, ticketData, engineerData] = await Promise.all([listClients(), listSites(), listDevices(), listAssets(), listTickets(), listEngineers().catch(() => [])]);
      const nextClients = normalizeClients(clientData as unknown[]);
      const nextSites = normalizeSites(siteData as unknown[], nextClients);
      const nextDevices = normalizeDevices(deviceData as unknown[], nextClients, nextSites);
      const nextAssets = normalizeAssets(assetData as unknown[], nextClients, nextSites, nextDevices);
      setClients(nextClients);
      setSites(nextSites);
      setDevices(nextDevices);
      setAssets(nextAssets);
      setRows(normalizeTickets(ticketData as unknown[], nextClients, nextSites, nextDevices, nextAssets));
      setEngineers(engineerData);
      setStatus("Connected to tickets API.");
    } catch (error) {
      setClients([]);
      setSites([]);
      setDevices([]);
      setAssets([]);
      setRows([]);
      setEngineers([]);
      setStatus(error instanceof Error ? error.message : "Unable to load tickets API data.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(payload: TicketRecord) {
    const body = toTicketPayload(payload);
    try {
      const saved = editing?.id ? await updateTicket(editing.id, body) : await createTicket(body);
      setRows(upsert(rows, normalizeTicket(saved, clients, sites, devices, assets), "id"));
      setStatus("Ticket saved through API and linked to selected device or asset.");
      setEditing(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save ticket through API.");
    }
  }

  async function remove(row: TicketRecord) {
    try {
      await deleteTicket(row.id);
      setStatus("Ticket deleted through API.");
      setRows(rows.filter((item) => item.id !== row.id));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to delete ticket through API.");
    }
  }

  async function saveComment() {
    if (!commentTicket || !comment.trim()) return;
    try {
      const saved = await addTicketComment(commentTicket.id, comment.trim()) as { id: string; comment: string; user?: { name: string } };
      const nextRows = rows.map((row) => row.id === commentTicket.id ? { ...row, comments: [...(row.comments ?? []), saved] } : row);
      setRows(nextRows);
      setStatus("Ticket comment added through API.");
      setComment("");
      setCommentTicket(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to add ticket comment through API.");
    }
  }

  return (
    <CrudFrame title="Tickets" description="Create tickets, link them with devices, update status, and add comments." status={status} actionLabel="Create Ticket" onAdd={() => setEditing(blankTicket(clients, sites, devices, assets))} onRefresh={load}>
      {editing && <TicketForm value={editing} clients={clients} sites={sites} devices={devices} assets={assets} engineers={engineers} onCancel={() => setEditing(null)} onSave={save} />}
      {commentTicket && (
        <Card className="mb-5">
          <h2 className="text-base font-semibold">Add Comment to {commentTicket.ticketNumber}</h2>
          <div className="mt-4 grid gap-4">
            <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add investigation notes, client update, or resolution details" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCommentTicket(null)}>Cancel</Button>
              <Button onClick={saveComment}><MessageSquarePlus className="h-4 w-4" /> Add Comment</Button>
            </div>
          </div>
        </Card>
      )}
      <DataTable
        columns={["Ticket ID", "Client", "Device", "Asset", "Subject", "Assigned Engineer", "Priority", "Status", "Comments", "SLA Due", "Actions"]}
        emptyMessage="No tickets found. New service tickets will appear here."
        rows={rows.map((row) => [
          row.ticketNumber,
          row.clientName,
          row.deviceName ?? "-",
          row.assetName ?? "-",
          row.subject,
          <EngineerBadge key="engineer" name={row.assignedEngineerName} />,
          <Badge key="priority">{displayStatus(row.priority)}</Badge>,
          <Badge key="status">{displayStatus(row.status)}</Badge>,
          String(row.comments?.length ?? 0),
          shortDate(row.slaDue),
          <TicketActions key="actions" onEdit={() => setEditing(row)} onComment={() => setCommentTicket(row)} onDelete={() => remove(row)} />,
        ])}
      />
    </CrudFrame>
  );
}

export function LiveClientPortalPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("Loading client portal data...");
  const [clientUser, setClientUser] = useState<{ role?: string; clientId?: string | null; email?: string } | null>(null);

  async function load() {
    try {
      const [clientData, siteData, deviceData, assetData, ticketData] = await Promise.all([listClients(), listSites(), listDevices(), listAssets(), listTickets()]);
      const nextClients = normalizeClients(clientData as unknown[]);
      const nextSites = normalizeSites(siteData as unknown[], nextClients);
      const nextDevices = normalizeDevices(deviceData as unknown[], nextClients, nextSites);
      const nextAssets = normalizeAssets(assetData as unknown[], nextClients, nextSites, nextDevices);
      const nextTickets = normalizeTickets(ticketData as unknown[], nextClients, nextSites, nextDevices);
      const currentUser = getStoredUser();
      const isClient = Boolean(currentUser?.role?.startsWith("CLIENT"));
      const scopedClientId = isClient ? currentUser?.clientId || nextClients[0]?.id || "" : clientId || nextClients[0]?.id || "";
      setClients(nextClients);
      setSites(nextSites);
      setDevices(nextDevices);
      setAssets(nextAssets);
      setTickets(nextTickets);
      setClientUser(currentUser);
      setClientId(scopedClientId);
      setStatus(isClient ? "Client portal restricted to your company only." : "Admin preview: choose a client to review their portal scope.");
    } catch (error) {
      setClients([]);
      setSites([]);
      setDevices([]);
      setAssets([]);
      setTickets([]);
      setStatus(error instanceof Error ? error.message : "Unable to load client portal API data.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const scopedDevices = devices.filter((device) => device.clientId === clientId);
  const scopedAssets = assets.filter((asset) => asset.clientId === clientId);
  const scopedTickets = tickets.filter((ticket) => ticket.clientId === clientId);

  return (
    <>
      <PageHeader title="Client Portal" description="Restricted client view backed by client-scoped API data." action={<Button onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>} />
      <Card className="mb-5">
        <div className="grid gap-4 md:grid-cols-[320px_1fr] md:items-end">
          {clientUser?.role?.startsWith("CLIENT") ? (
            <div>
              <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Client scope</p>
              <p className="mt-1 text-sm font-semibold">{clients.find((client) => client.id === clientId)?.name ?? "Your company"}</p>
            </div>
          ) : (
            <Field label="Client scope">
              <Select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </Select>
            </Field>
          )}
          <p className="text-sm text-slate-500 dark:text-slate-400">{status}</p>
        </div>
      </Card>
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Metric label="My Devices" value={String(scopedDevices.length)} />
        <Metric label="My Tickets" value={String(scopedTickets.length)} />
        <Metric label="My Assets" value={String(scopedAssets.length)} />
        <Metric label="Open Tickets" value={String(scopedTickets.filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status)).length)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <DataTable columns={["Hostname", "Site", "OS", "Status"]} rows={scopedDevices.map((device) => [device.hostname, device.siteName, device.os, <Badge key="status">{displayStatus(device.status)}</Badge>])} />
        <DataTable columns={["Asset Tag", "Type", "Site", "Status"]} rows={scopedAssets.map((asset) => [asset.assetTag, asset.deviceType, asset.siteName, <Badge key="status">{displayStatus(asset.status)}</Badge>])} />
        <DataTable columns={["Ticket", "Subject", "Device", "Status"]} rows={scopedTickets.map((ticket) => [ticket.ticketNumber, ticket.subject, ticket.deviceName ?? "-", <Badge key="status">{displayStatus(ticket.status)}</Badge>])} />
      </div>
    </>
  );
}

export function LiveAuditLogsPanel() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [status, setStatus] = useState("Loading audit logs...");

  async function load() {
    try {
      const logs = await listAuditLogs();
      setRows(logs);
      setStatus("Audit log API connected.");
    } catch (error) {
      setRows([]);
      setStatus(error instanceof Error ? error.message : "Unable to load audit log API data.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Audit Logs</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{status}</p>
        </div>
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>
      <DataTable
        columns={["Action", "Module", "Description", "User", "IP Address", "Time"]}
        rows={rows.map((row) => [row.action, row.module, row.description, row.user?.name ?? "-", row.ipAddress ?? "-", shortDate(row.createdAt)])}
      />
    </Card>
  );
}

function CrudFrame({ title, description, status, actionLabel, onAdd, onRefresh, children }: { title: string; description: string; status: string; actionLabel: string; onAdd: () => void; onRefresh: () => void; children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={onRefresh}><RefreshCw className="h-4 w-4" /> Refresh</Button>
            <Button onClick={onAdd}><Plus className="h-4 w-4" /> {actionLabel}</Button>
          </div>
        }
      />
      <Card className="mb-5 p-3">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <ShieldCheck className="h-4 w-4 text-success" />
          {status}
        </div>
      </Card>
      {children}
    </>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
      <Button size="sm" variant="danger" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
    </div>
  );
}

function DeviceTableActions({
  row,
  remoteStatus,
  checking,
  onCheck,
  onOpen,
  onEdit,
}: {
  row: DeviceRecord;
  remoteStatus: RemoteControlStatus | null;
  checking: boolean;
  onCheck: (row: DeviceRecord) => void;
  onOpen: (row: DeviceRecord, mode: "desktop" | "terminal" | "files") => void;
  onEdit: () => void;
}) {
  const meshLinked = Boolean(row.meshNodeId);
  const configured = Boolean(remoteStatus?.configured);
  const disabled = !configured || !meshLinked;
  const reason = !configured ? "Remote control not configured" : !meshLinked ? "Mesh agent not linked" : undefined;

  return (
    <div className="min-w-[440px]">
      <div className="flex flex-wrap gap-2">
        <LinkButton size="sm" variant="outline" href={`/devices/${row.id}`}>View</LinkButton>
        <Button size="sm" variant="secondary" disabled={checking} onClick={() => onCheck(row)}>{checking ? "Requesting..." : "Check Now"}</Button>
        <span title={disabled ? reason : undefined}>
          <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onOpen(row, "desktop")}>
            <MonitorUp className="h-3.5 w-3.5" /> Take Control
          </Button>
        </span>
        <span title={disabled ? reason : undefined}>
          <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onOpen(row, "terminal")}>
            <Terminal className="h-3.5 w-3.5" /> Terminal
          </Button>
        </span>
        <span title={disabled ? reason : undefined}>
          <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onOpen(row, "files")}>
            <FolderOpen className="h-3.5 w-3.5" /> File Manager
          </Button>
        </span>
        <span title="Coming soon"><Button size="sm" variant="secondary" disabled>Scripts</Button></span>
        <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
      </div>
      {reason && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{reason}</p>}
    </div>
  );
}

function TicketActions({ onEdit, onComment, onDelete }: { onEdit: () => void; onComment: () => void; onDelete: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
      <Button size="sm" variant="outline" onClick={onComment}>Comment</Button>
      <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
    </div>
  );
}

function ClientForm({ value, engineers, onCancel, onSave }: { value: ClientRecord; engineers: EngineerRecord[]; onCancel: () => void; onSave: (value: ClientRecord) => void }) {
  const [form, setForm] = useState(value);
  const canAssignEngineers = getStoredUser()?.role === "SUPER_ADMIN";
  return (
    <Editor title={value.id ? "Edit Client" : "Add Client"} onCancel={onCancel} onSave={() => onSave(form)}>
      <Field label="Client Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
      <Field label="Contact Person"><Input value={form.contactPerson} onChange={(event) => setForm({ ...form, contactPerson: event.target.value })} /></Field>
      <Field label="Email"><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
      <Field label="Phone"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
      <Field label="SLA Plan"><Input value={form.slaPlan} onChange={(event) => setForm({ ...form, slaPlan: event.target.value })} /></Field>
      <Field label="Status"><EnumSelect value={form.status} options={statusOptions} onChange={(status) => setForm({ ...form, status })} /></Field>
      {canAssignEngineers && <EngineerSelect value={form.assignedEngineerId} engineers={engineers} onChange={(assignedEngineerId) => setForm({ ...form, assignedEngineerId })} />}
      <div className="md:col-span-2"><Field label="Address"><Input value={form.address ?? ""} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field></div>
    </Editor>
  );
}

function ClientPortalUserForm({
  clients,
  onCancel,
  onSave,
}: {
  clients: ClientRecord[];
  onCancel: () => void;
  onSave: (value: { clientId: string; name: string; email: string; password: string; role: "CLIENT_ADMIN" | "CLIENT_VIEWER" }) => void;
}) {
  const firstClient = clients[0];
  const [form, setForm] = useState({
    clientId: firstClient?.id ?? "",
    name: firstClient ? `${firstClient.name} Admin` : "",
    email: firstClient ? `admin@${slug(firstClient.name)}.local` : "",
    password: "",
    role: "CLIENT_ADMIN" as "CLIENT_ADMIN" | "CLIENT_VIEWER",
  });

  function changeClient(clientId: string) {
    const client = clients.find((item) => item.id === clientId);
    setForm({
      ...form,
      clientId,
      name: client ? `${client.name} Admin` : form.name,
      email: client ? `admin@${slug(client.name)}.local` : form.email,
    });
  }

  return (
    <Editor title="Create Client Portal Login" onCancel={onCancel} onSave={() => onSave(form)}>
      <Field label="Client Company">
        <Select value={form.clientId} onChange={(event) => changeClient(event.target.value)}>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </Select>
      </Field>
      <Field label="User Name">
        <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </Field>
      <Field label="Login Email">
        <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      </Field>
      <Field label="Password">
        <Input type="text" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
      </Field>
      <Field label="Role">
        <Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as "CLIENT_ADMIN" | "CLIENT_VIEWER" })}>
          <option value="CLIENT_ADMIN">Client Admin</option>
          <option value="CLIENT_VIEWER">Client Viewer</option>
        </Select>
      </Field>
    </Editor>
  );
}

function SiteForm({ value, clients, engineers, onCancel, onSave }: { value: SiteRecord; clients: ClientRecord[]; engineers: EngineerRecord[]; onCancel: () => void; onSave: (value: SiteRecord) => void }) {
  const [form, setForm] = useState(value);
  const canAssignEngineers = getStoredUser()?.role === "SUPER_ADMIN";
  return (
    <Editor title={value.id ? "Edit Site" : "Add Site"} onCancel={onCancel} onSave={() => onSave(form)}>
      <Field label="Client"><Select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</Select></Field>
      <Field label="Site Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
      <Field label="Location"><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
      <Field label="Network Range"><Input value={form.networkRange} onChange={(event) => setForm({ ...form, networkRange: event.target.value })} /></Field>
      <Field label="Status"><EnumSelect value={form.status} options={statusOptions} onChange={(status) => setForm({ ...form, status })} /></Field>
      {canAssignEngineers && <EngineerSelect value={form.assignedEngineerId} engineers={engineers} onChange={(assignedEngineerId) => setForm({ ...form, assignedEngineerId })} />}
    </Editor>
  );
}

function DeviceForm({ value, clients, sites, onCancel, onSave }: { value: DeviceRecord; clients: ClientRecord[]; sites: SiteRecord[]; onCancel: () => void; onSave: (value: DeviceRecord) => void }) {
  const [form, setForm] = useState(value);
  const filteredSites = sites.filter((site) => site.clientId === form.clientId);
  return (
    <Editor title={value.id ? "Edit Device" : "Add Device"} onCancel={onCancel} onSave={() => onSave(form)}>
      <Field label="Client"><Select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value, siteId: sites.find((site) => site.clientId === event.target.value)?.id ?? "" })}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</Select></Field>
      <Field label="Site"><Select value={form.siteId} onChange={(event) => setForm({ ...form, siteId: event.target.value })}>{filteredSites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</Select></Field>
      <Field label="Hostname"><Input value={form.hostname} onChange={(event) => setForm({ ...form, hostname: event.target.value })} /></Field>
      <Field label="OS"><Input value={form.os} onChange={(event) => setForm({ ...form, os: event.target.value })} /></Field>
      <Field label="IP Address"><Input value={form.ipAddress} onChange={(event) => setForm({ ...form, ipAddress: event.target.value })} /></Field>
      <Field label="MAC Address"><Input value={form.macAddress} onChange={(event) => setForm({ ...form, macAddress: event.target.value })} /></Field>
      <Field label="Device Type"><Input value={form.deviceType} onChange={(event) => setForm({ ...form, deviceType: event.target.value })} /></Field>
      <Field label="Status"><EnumSelect value={form.status} options={deviceStatusOptions} onChange={(status) => setForm({ ...form, status })} /></Field>
      <Field label="Agent Version"><Input value={form.agentVersion ?? ""} onChange={(event) => setForm({ ...form, agentVersion: event.target.value })} /></Field>
      <Field label="Assigned User"><Input value={form.assignedUser ?? ""} onChange={(event) => setForm({ ...form, assignedUser: event.target.value })} /></Field>
      <Field label="Serial Number"><Input value={form.serialNumber ?? ""} onChange={(event) => setForm({ ...form, serialNumber: event.target.value })} /></Field>
    </Editor>
  );
}

function AssetForm({ value, clients, sites, devices, onCancel, onSave }: { value: AssetRecord; clients: ClientRecord[]; sites: SiteRecord[]; devices: DeviceRecord[]; onCancel: () => void; onSave: (value: AssetRecord) => void }) {
  const [form, setForm] = useState(value);
  const filteredSites = sites.filter((site) => site.clientId === form.clientId);
  const filteredDevices = devices.filter((device) => device.clientId === form.clientId);
  return (
    <Editor title={value.id ? "Edit Asset" : "Add Asset"} onCancel={onCancel} onSave={() => onSave(form)}>
      <Field label="Client"><Select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value, siteId: sites.find((site) => site.clientId === event.target.value)?.id ?? "", deviceId: "" })}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</Select></Field>
      <Field label="Site"><Select value={form.siteId} onChange={(event) => setForm({ ...form, siteId: event.target.value })}>{filteredSites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</Select></Field>
      <Field label="Linked Device"><Select value={form.deviceId ?? ""} onChange={(event) => setForm({ ...form, deviceId: event.target.value || null })}><option value="">None</option>{filteredDevices.map((device) => <option key={device.id} value={device.id}>{device.hostname}</option>)}</Select></Field>
      <Field label="Name"><Input value={form.name ?? ""} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
      <Field label="Asset Tag"><Input value={form.assetTag} onChange={(event) => setForm({ ...form, assetTag: event.target.value })} /></Field>
      <Field label="Serial Number"><Input value={form.serialNumber} onChange={(event) => setForm({ ...form, serialNumber: event.target.value })} /></Field>
      <Field label="Device Type"><Input value={form.deviceType} onChange={(event) => setForm({ ...form, deviceType: event.target.value })} /></Field>
      <Field label="Assigned User"><Input value={form.assignedUser ?? ""} onChange={(event) => setForm({ ...form, assignedUser: event.target.value })} /></Field>
      <Field label="Location"><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
      <Field label="Warranty Expiry"><Input type="date" value={dateInput(form.warrantyExpiry)} onChange={(event) => setForm({ ...form, warrantyExpiry: event.target.value })} /></Field>
      <Field label="Status"><EnumSelect value={form.status} options={assetStatusOptions} onChange={(status) => setForm({ ...form, status })} /></Field>
    </Editor>
  );
}

function TicketForm({ value, clients, sites, devices, assets, engineers, onCancel, onSave }: { value: TicketRecord; clients: ClientRecord[]; sites: SiteRecord[]; devices: DeviceRecord[]; assets: AssetRecord[]; engineers: EngineerRecord[]; onCancel: () => void; onSave: (value: TicketRecord) => void }) {
  const [form, setForm] = useState(value);
  const filteredSites = sites.filter((site) => site.clientId === form.clientId);
  const filteredDevices = devices.filter((device) => device.clientId === form.clientId);
  const filteredAssets = assets.filter((asset) => asset.clientId === form.clientId);
  function selectDevice(deviceId: string) {
    const device = devices.find((item) => item.id === deviceId);
    setForm({
      ...form,
      deviceId: deviceId || null,
      siteId: device?.siteId ?? form.siteId,
      assignedEngineerId: device?.primaryEngineerId ?? form.assignedEngineerId ?? null,
    });
  }
  return (
    <Editor title={value.id ? "Edit Ticket" : "Create Ticket"} onCancel={onCancel} onSave={() => onSave(form)}>
      <Field label="Client"><Select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value, siteId: sites.find((site) => site.clientId === event.target.value)?.id ?? "", deviceId: "", assetId: "" })}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</Select></Field>
      <Field label="Site"><Select value={form.siteId ?? ""} onChange={(event) => setForm({ ...form, siteId: event.target.value || null })}><option value="">None</option>{filteredSites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</Select></Field>
      <Field label="Linked Device"><Select value={form.deviceId ?? ""} onChange={(event) => selectDevice(event.target.value)}><option value="">None</option>{filteredDevices.map((device) => <option key={device.id} value={device.id}>{device.hostname}</option>)}</Select></Field>
      <Field label="Linked Asset"><Select value={form.assetId ?? ""} onChange={(event) => setForm({ ...form, assetId: event.target.value || null })}><option value="">None</option>{filteredAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name ?? asset.assetTag}</option>)}</Select></Field>
      <Field label="Ticket Number"><Input value={form.ticketNumber} onChange={(event) => setForm({ ...form, ticketNumber: event.target.value })} /></Field>
      <Field label="Subject"><Input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></Field>
      <Field label="Priority"><EnumSelect value={form.priority} options={priorityOptions} onChange={(priority) => setForm({ ...form, priority })} /></Field>
      <Field label="Status"><EnumSelect value={form.status} options={ticketStatusOptions} onChange={(status) => setForm({ ...form, status })} /></Field>
      <EngineerSelect value={form.assignedEngineerId} engineers={engineers} onChange={(assignedEngineerId) => setForm({ ...form, assignedEngineerId })} />
      <div className="md:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div>
    </Editor>
  );
}

function Editor({ title, onCancel, onSave, children }: { title: string; onCancel: () => void; onSave: () => void; children: React.ReactNode }) {
  return (
    <Card className="mb-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave}><Save className="h-4 w-4" /> Save</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </Card>
  );
}

function EnumSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return <Select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{displayStatus(option)}</option>)}</Select>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{value}</p>
    </Card>
  );
}

function normalizeClients(data: unknown[]): ClientRecord[] {
  return data.map(normalizeClient);
}

function normalizeClient(item: any): ClientRecord {
  return {
    id: String(item.id ?? slug(item.name)),
    name: item.name ?? "Unnamed Client",
    contactPerson: item.contactPerson ?? item.contact ?? "",
    email: item.email ?? "",
    phone: item.phone ?? "",
    address: item.address ?? "",
    status: item.status ?? "HEALTHY",
    slaPlan: item.slaPlan ?? item.sla ?? "Gold 24x7",
    assignedEngineerId: item.assignedEngineerId ?? item.assignedEngineer?.id ?? null,
    assignedEngineerName: item.assignedEngineer?.name,
    assignedEngineerEmail: item.assignedEngineer?.email,
  };
}

function normalizeSites(data: unknown[], clients: ClientRecord[]): SiteRecord[] {
  return data.map((item) => normalizeSite(item, clients));
}

function normalizeSite(item: any, clients: ClientRecord[]): SiteRecord {
  const clientId = item.clientId ?? clients.find((client) => client.name === item.client)?.id ?? clients[0]?.id ?? "";
  return {
    id: String(item.id ?? slug(item.name)),
    clientId,
    clientName: item.client?.name ?? item.client ?? clients.find((client) => client.id === clientId)?.name ?? "Unknown Client",
    name: item.name ?? "Unnamed Site",
    location: item.location ?? "",
    networkRange: item.networkRange ?? item.range ?? "",
    status: item.status ?? "HEALTHY",
    assignedEngineerId: item.assignedEngineerId ?? item.assignedEngineer?.id ?? null,
    assignedEngineerName: item.assignedEngineer?.name,
    assignedEngineerEmail: item.assignedEngineer?.email,
  };
}

function normalizeDevices(data: unknown[], clients: ClientRecord[], sites: SiteRecord[]): DeviceRecord[] {
  return data.map((item) => normalizeDevice(item, clients, sites));
}

function normalizeDevice(item: any, clients: ClientRecord[], sites: SiteRecord[]): DeviceRecord {
  const clientId = item.clientId ?? clients.find((client) => client.name === item.client)?.id ?? clients[0]?.id ?? "";
  const siteId = item.siteId ?? sites.find((site) => site.name === item.site)?.id ?? sites.find((site) => site.clientId === clientId)?.id ?? "";
  return {
    id: String(item.id ?? slug(item.hostname)),
    clientId,
    clientName: item.client?.name ?? item.client ?? clients.find((client) => client.id === clientId)?.name ?? "Unknown Client",
    siteId,
    siteName: item.site?.name ?? item.site ?? sites.find((site) => site.id === siteId)?.name ?? "Unknown Site",
    hostname: item.hostname ?? "unnamed-device",
    os: item.os ?? "",
    osName: item.osName,
    ipAddress: item.ipAddress ?? item.ip ?? "",
    macAddress: item.macAddress ?? item.mac ?? "",
    status: item.status ?? "ONLINE",
    derivedStatus: item.derivedStatus,
    lastSeen: item.lastSeen,
    lastUninstalledAt: item.lastUninstalledAt,
    agentVersion: item.agentVersion ?? item.agent,
    assignedUser: item.assignedUser ?? item.user,
    deviceType: item.deviceType ?? item.type ?? "Workstation",
    serialNumber: item.serialNumber,
    meshNodeId: item.meshNodeId ?? item.agent?.meshNodeId ?? null,
    remoteControlEnabled: Boolean(item.remoteControlEnabled ?? item.meshNodeId ?? item.agent?.meshNodeId),
    remoteConsentRequired: item.remoteConsentRequired,
    primaryEngineerId: item.site?.assignedEngineerId ?? item.site?.assignedEngineer?.id ?? item.client?.assignedEngineerId ?? item.client?.assignedEngineer?.id ?? null,
    primaryEngineerName: item.site?.assignedEngineer?.name ?? item.client?.assignedEngineer?.name,
  };
}

function EngineerSelect({ value, engineers, onChange }: { value?: string | null; engineers: EngineerRecord[]; onChange: (value: string | null) => void }) {
  return (
    <Field label="Assigned Engineer">
      <Select value={value ?? ""} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">None</option>
        {engineers.map((engineer) => <option key={engineer.id} value={engineer.id}>{engineer.name} ({displayStatus(engineer.role)})</option>)}
      </Select>
    </Field>
  );
}

function EngineerBadge({ name }: { name?: string }) {
  return <Badge>{name || "Unassigned"}</Badge>;
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-3 dark:border-slate-800">
      <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function normalizeAssets(data: unknown[], clients: ClientRecord[], sites: SiteRecord[], devices: DeviceRecord[]): AssetRecord[] {
  return data.map((item) => normalizeAsset(item, clients, sites, devices));
}

function normalizeAsset(item: any, clients: ClientRecord[], sites: SiteRecord[], devices: DeviceRecord[]): AssetRecord {
  const clientId = item.clientId ?? clients.find((client) => client.name === item.client)?.id ?? clients[0]?.id ?? "";
  const siteId = item.siteId ?? sites.find((site) => site.name === item.site)?.id ?? sites.find((site) => site.clientId === clientId)?.id ?? "";
  return {
    id: String(item.id ?? item.assetTag ?? item.tag),
    clientId,
    clientName: item.client?.name ?? item.client ?? clients.find((client) => client.id === clientId)?.name ?? "Unknown Client",
    siteId,
    siteName: item.site?.name ?? item.site ?? sites.find((site) => site.id === siteId)?.name ?? "Unknown Site",
    deviceId: item.deviceId ?? devices.find((device) => device.hostname === item.device)?.id,
    deviceName: item.device?.hostname ?? item.device ?? devices.find((device) => device.id === item.deviceId)?.hostname,
    name: item.name,
    assetTag: item.assetTag ?? item.tag ?? "",
    serialNumber: item.serialNumber ?? item.serial ?? "",
    deviceType: item.deviceType ?? item.type ?? "",
    assignedUser: item.assignedUser ?? item.user,
    location: item.location ?? "",
    purchaseDate: item.purchaseDate ?? item.purchase,
    warrantyExpiry: item.warrantyExpiry ?? item.warranty,
    status: item.status ?? "ACTIVE",
  };
}

function normalizeTickets(data: unknown[], clients: ClientRecord[], sites: SiteRecord[], devices: DeviceRecord[], assets: AssetRecord[] = []): TicketRecord[] {
  return data.map((item) => normalizeTicket(item, clients, sites, devices, assets));
}

function normalizeTicket(item: any, clients: ClientRecord[], sites: SiteRecord[], devices: DeviceRecord[], assets: AssetRecord[] = []): TicketRecord {
  const clientId = item.clientId ?? clients.find((client) => client.name === item.client)?.id ?? clients[0]?.id ?? "";
  const deviceId = item.deviceId ?? devices.find((device) => device.hostname === item.device)?.id;
  const assetId = item.assetId ?? assets.find((asset) => asset.name === item.asset || asset.assetTag === item.asset)?.id;
  const siteId = item.siteId ?? devices.find((device) => device.id === deviceId)?.siteId ?? sites.find((site) => site.clientId === clientId)?.id;
  return {
    id: String(item.id ?? item.ticketNumber),
    ticketNumber: item.ticketNumber ?? item.id ?? `NSC-${Date.now().toString().slice(-4)}`,
    clientId,
    clientName: item.client?.name ?? item.client ?? clients.find((client) => client.id === clientId)?.name ?? "Unknown Client",
    siteId,
    siteName: item.site?.name ?? sites.find((site) => site.id === siteId)?.name,
    deviceId,
    deviceName: item.device?.hostname ?? item.device ?? devices.find((device) => device.id === deviceId)?.hostname,
    assetId,
    assetName: item.asset?.name ?? item.asset?.assetTag ?? assets.find((asset) => asset.id === assetId)?.name ?? assets.find((asset) => asset.id === assetId)?.assetTag,
    subject: item.subject ?? "",
    description: item.description ?? item.subject ?? "",
    priority: item.priority ?? "MEDIUM",
    status: item.status ?? "OPEN",
    assignedEngineerName: item.assignedEngineer?.name ?? item.engineer,
    assignedEngineerId: item.assignedEngineerId ?? item.assignedEngineer?.id ?? null,
    assignedEngineerEmail: item.assignedEngineer?.email,
    slaDue: item.slaDue ?? item.due,
    comments: item.comments ?? [],
  };
}

function toSitePayload(row: SiteRecord) {
  return { clientId: row.clientId, name: row.name, location: row.location, networkRange: row.networkRange, status: row.status, assignedEngineerId: row.assignedEngineerId || null };
}

function toDevicePayload(row: DeviceRecord) {
  return { clientId: row.clientId, siteId: row.siteId, hostname: row.hostname, os: row.os, ipAddress: row.ipAddress, macAddress: row.macAddress, status: row.status, agentVersion: row.agentVersion, assignedUser: row.assignedUser, deviceType: row.deviceType, serialNumber: row.serialNumber };
}

function toAssetPayload(row: AssetRecord) {
  return { clientId: row.clientId, siteId: row.siteId, deviceId: row.deviceId || null, name: row.name, assetTag: row.assetTag, serialNumber: row.serialNumber, deviceType: row.deviceType, assignedUser: row.assignedUser, location: row.location, purchaseDate: toIso(row.purchaseDate), warrantyExpiry: toIso(row.warrantyExpiry), status: row.status };
}

function toTicketPayload(row: TicketRecord) {
  return { ticketNumber: row.ticketNumber, clientId: row.clientId, siteId: row.siteId || null, deviceId: row.deviceId || null, assetId: row.assetId || null, subject: row.subject, description: row.description, priority: row.priority, status: row.status, assignedEngineerId: row.assignedEngineerId || null, slaDue: toIso(row.slaDue) };
}

function blankClient(): ClientRecord {
  return { id: "", name: "", contactPerson: "", email: "", phone: "", address: "", status: "HEALTHY", slaPlan: "Gold 24x7", assignedEngineerId: null };
}

function blankSite(clients: ClientRecord[]): SiteRecord {
  return { id: "", clientId: clients[0]?.id ?? "", clientName: clients[0]?.name ?? "", name: "", location: "", networkRange: "", status: "HEALTHY", assignedEngineerId: null };
}

function blankDevice(clients: ClientRecord[], sites: SiteRecord[]): DeviceRecord {
  const clientId = clients[0]?.id ?? "";
  return { id: "", clientId, clientName: clients[0]?.name ?? "", siteId: sites.find((site) => site.clientId === clientId)?.id ?? "", siteName: "", hostname: "", os: "Windows 11 Pro", ipAddress: "", macAddress: "", status: "ONLINE", agentVersion: "2.8.14", assignedUser: "", deviceType: "Workstation", serialNumber: "", meshNodeId: null, remoteControlEnabled: false };
}

function blankAsset(clients: ClientRecord[], sites: SiteRecord[], devices: DeviceRecord[]): AssetRecord {
  const clientId = clients[0]?.id ?? "";
  return { id: "", clientId, clientName: clients[0]?.name ?? "", siteId: sites.find((site) => site.clientId === clientId)?.id ?? "", siteName: "", deviceId: devices.find((device) => device.clientId === clientId)?.id ?? null, name: "", assetTag: "", serialNumber: "", deviceType: "Workstation", assignedUser: "", location: "", status: "ACTIVE" };
}

function blankTicket(clients: ClientRecord[], sites: SiteRecord[], devices: DeviceRecord[], assets: AssetRecord[] = []): TicketRecord {
  const clientId = clients[0]?.id ?? "";
  const device = devices.find((item) => item.clientId === clientId);
  const asset = assets.find((item) => item.clientId === clientId);
  return { id: "", ticketNumber: `NSC-${Date.now().toString().slice(-4)}`, clientId, clientName: clients[0]?.name ?? "", siteId: device?.siteId ?? asset?.siteId ?? sites.find((site) => site.clientId === clientId)?.id, deviceId: device?.id, deviceName: device?.hostname, assetId: asset?.id, assetName: asset?.name ?? asset?.assetTag, subject: "", description: "", priority: "MEDIUM", status: "OPEN", assignedEngineerId: device?.primaryEngineerId ?? null, comments: [] };
}

function upsert<T extends Record<string, any>>(rows: T[], next: T, key: keyof T) {
  const existing = rows.some((row) => row[key] === next[key]);
  return existing ? rows.map((row) => row[key] === next[key] ? next : row) : [next, ...rows];
}

function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem("nscope_user") ?? "null") as { role?: string; clientId?: string | null; email?: string } | null;
  } catch {
    return null;
  }
}

function displayStatus(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shortDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function dateInput(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function toIso(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function slug(value: string) {
  return String(value ?? "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
