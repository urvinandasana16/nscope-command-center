import {
  Activity,
  ArchiveRestore,
  CheckCircle2,
  Download,
  FolderOpen,
  FileText,
  Filter,
  KeyRound,
  MonitorUp,
  MoreHorizontal,
  Play,
  Plus,
  Power,
  RefreshCw,
  Shield,
  Terminal,
} from "lucide-react";
import {
  alerts,
  assets,
  backups,
  clients,
  devices,
  discoveryResults,
  reportCards,
  sites,
  tickets,
  userRoles,
} from "@/lib/mock-data";
import { slugify } from "@/lib/utils";
import { LiveDashboardPage } from "./live-dashboard-page";
import { LiveAgentDeploymentPage } from "./live-agent-deployment-page";
import { LiveDeviceDetailPage } from "./live-device-detail-page";
import { LiveAssetsPage, LiveAuditLogsPanel, LiveClientPortalPage, LiveClientsPage, LiveDevicesPage, LiveSitesPage, LiveTicketsPage } from "./live-resource-pages";
import { Badge, Button, Card, DataTable, Field, Input, LinkButton, PageHeader, Select, Textarea } from "./ui/primitives";

export const consoleSections = [
  "dashboard",
  "clients",
  "sites",
  "devices",
  "network-discovery",
  "agent-deployment",
  "remote-access",
  "backup-recovery",
  "monitoring",
  "assets",
  "tickets",
  "client-portal",
  "reports",
  "settings",
];

export function ConsolePage({ section }: { section: string }) {
  if (section === "dashboard") {
    return <LiveDashboardPage />;
  }

  const pages: Record<string, React.ReactNode> = {
    clients: <LiveClientsPage />,
    sites: <LiveSitesPage />,
    devices: <LiveDevicesPage />,
    "network-discovery": <NetworkDiscoveryPage />,
    "agent-deployment": <LiveAgentDeploymentPage />,
    "remote-access": <RemoteAccessPage />,
    "backup-recovery": <BackupRecoveryPage />,
    monitoring: <MonitoringPage />,
    assets: <LiveAssetsPage />,
    tickets: <LiveTicketsPage />,
    "client-portal": <LiveClientPortalPage />,
    reports: <ReportsPage />,
    settings: <SettingsPage />,
  };

  return pages[section] ?? <LiveDashboardPage />;
}

export function DetailPage({ section, id }: { section: string; id: string }) {
  if (section === "clients") {
    const client = clients.find((item) => item.id === id) ?? clients[0];
    return <ClientDetailsPage clientName={client.name} />;
  }

  if (section === "devices") {
    return <LiveDeviceDetailPage deviceId={id} />;
  }

  if (section === "tickets") {
    const ticket = tickets.find((item) => slugify(item.id) === id) ?? tickets[0];
    return <TicketDetailsPage ticketId={ticket.id} />;
  }

  return <ReportsPage />;
}

function ClientsPage() {
  return (
    <>
      <PageHeader
        title="Clients"
        description="MSP customer portfolio with operational counts, SLA posture, open tickets, and quick management actions."
        action={<Button><Plus className="h-4 w-4" /> Add Client</Button>}
      />
      <Toolbar />
      <DataTable
        columns={["Client Name", "Contact Person", "Email", "Phone", "Sites", "Devices", "Open Tickets", "Status", "Actions"]}
        rows={clients.map((client) => [
          <LinkButton key="view" href={`/clients/${client.id}`} variant="ghost" className="justify-start px-0 text-accent">{client.name}</LinkButton>,
          client.contact,
          client.email,
          client.phone,
          client.sites,
          client.devices,
          client.tickets,
          <Badge key="status">{client.status}</Badge>,
          <ActionStrip key="actions" actions={["View Client", "Edit", "Add Site", "View Devices", "View Tickets"]} />,
        ])}
      />
    </>
  );
}

function ClientDetailsPage({ clientName }: { clientName: string }) {
  const client = clients.find((item) => item.name === clientName) ?? clients[0];
  const clientSites = sites.filter((site) => site.client === client.name);
  const clientDevices = devices.filter((device) => device.client === client.name);
  const clientTickets = tickets.filter((ticket) => ticket.client === client.name);

  return (
    <>
      <PageHeader
        title={client.name}
        description="Client overview with sites, devices, tickets, assets, contacts, reports, and SLA plan in one account workspace."
        action={<Button><Plus className="h-4 w-4" /> Add Site</Button>}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Sites" value={String(clientSites.length)} />
        <Metric label="Devices" value={String(clientDevices.length)} />
        <Metric label="Open Tickets" value={String(clientTickets.length)} />
        <Metric label="SLA Plan" value={client.sla} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <InfoPanel title="Sites">
            <DataTable columns={["Site", "Location", "Network Range", "Devices", "Status"]} rows={clientSites.map((site) => [site.name, site.location, site.range, site.deviceCount, <Badge key="status">{site.status}</Badge>])} />
          </InfoPanel>
          <InfoPanel title="Devices">
            <DataTable columns={["Hostname", "OS", "IP", "Status", "Last Seen"]} rows={clientDevices.map((device) => [device.hostname, device.os, device.ip, <Badge key="status">{device.status}</Badge>, device.lastSeen])} />
          </InfoPanel>
          <InfoPanel title="Tickets">
            <DataTable columns={["Ticket", "Subject", "Priority", "Status", "Engineer"]} rows={clientTickets.map((ticket) => [ticket.id, ticket.subject, ticket.priority, <Badge key="status">{ticket.status}</Badge>, ticket.engineer])} />
          </InfoPanel>
        </div>
        <div className="space-y-5">
          <Card>
            <h2 className="text-base font-semibold">Client Overview</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <Line label="Industry" value={client.industry} />
              <Line label="Contact" value={client.contact} />
              <Line label="Email" value={client.email} />
              <Line label="Phone" value={client.phone} />
              <Line label="Status" value={client.status} />
            </div>
          </Card>
          <Card>
            <h2 className="text-base font-semibold">Contacts</h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Primary, billing, escalation, and client portal contacts are managed here.</p>
          </Card>
          <Card>
            <h2 className="text-base font-semibold">Assets & Reports</h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Warranty, monthly health, SLA, and inventory reports are available from this client workspace.</p>
          </Card>
        </div>
      </div>
    </>
  );
}

function SitesPage() {
  return (
    <>
      <PageHeader title="Sites" description="Client locations, network ranges, device density, and operational status by branch or office." action={<Button><Plus className="h-4 w-4" /> Add Site</Button>} />
      <Toolbar />
      <DataTable
        columns={["Site Name", "Client", "Location", "Device Count", "Network Range", "Status", "Actions"]}
        rows={sites.map((site) => [site.name, site.client, site.location, site.deviceCount, site.range, <Badge key="status">{site.status}</Badge>, <ActionStrip key="actions" actions={["View", "Edit", "Scan", "Devices"]} />])}
      />
    </>
  );
}

function DevicesPage() {
  return (
    <>
      <PageHeader title="Devices" description="Inventory of endpoints, servers, firewalls, switches, printers, and managed infrastructure." action={<Button><MonitorUp className="h-4 w-4" /> Deploy Agent</Button>} />
      <Toolbar />
      <DataTable
        columns={["Hostname", "Client", "Site", "OS", "IP Address", "MAC Address", "Status", "Last Seen", "Agent Version", "Assigned User", "Actions"]}
        rows={devices.map((device) => [
          <LinkButton key="device" href={`/devices/${device.id}`} variant="ghost" className="justify-start px-0 text-accent">{device.hostname}</LinkButton>,
          device.client,
          device.site,
          device.os,
          device.ip,
          device.mac,
          <Badge key="status">{device.status}</Badge>,
          device.lastSeen,
          device.agent,
          device.user,
          <ActionStrip key="actions" actions={["View Details", "Take Control", "Remote Terminal", "File Manager", "Run Script", "Create Ticket"]} />,
        ])}
      />
    </>
  );
}

function DeviceDetailsPage({ deviceId }: { deviceId: string }) {
  const device = devices.find((item) => item.id === deviceId) ?? devices[0];
  const linkedTickets = tickets.filter((ticket) => ticket.device === device.hostname);
  const recentAlerts = alerts.filter((alert) => alert.hostname === device.hostname);

  return (
    <>
      <PageHeader title={device.hostname} description="Device record with live system context, inventory facts, linked tickets, backup posture, and remote actions." action={<Badge>{device.status}</Badge>} />
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="OS" value={device.os} />
        <Metric label="IP Address" value={device.ip} />
        <Metric label="Last Seen" value={device.lastSeen} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <InfoPanel title="System Overview">
            <div className="grid gap-4 md:grid-cols-2">
              <Line label="Client" value={device.client} />
              <Line label="Site" value={device.site} />
              <Line label="Assigned User" value={device.user} />
              <Line label="Agent Version" value={device.agent} />
            </div>
          </InfoPanel>
          <InfoPanel title="Hardware Info">
            <div className="grid gap-4 md:grid-cols-3">
              <Line label="CPU" value={device.cpu} />
              <Line label="Memory" value={device.memory} />
              <Line label="Storage" value={device.disk} />
            </div>
          </InfoPanel>
          <InfoPanel title="OS & Network Info">
            <div className="grid gap-4 md:grid-cols-3">
              <Line label="Operating System" value={device.os} />
              <Line label="MAC Address" value={device.mac} />
              <Line label="Device Type" value={device.type} />
            </div>
          </InfoPanel>
          <InfoPanel title="Installed Software">
            <PillRow values={["Microsoft 365 Apps", "N-SCOPE Agent", "Chrome Enterprise", "BitLocker", "7-Zip"]} />
          </InfoPanel>
          <InfoPanel title="Running Services">
            <PillRow values={["Agent Service", "Windows Update", "Backup Scheduler", "Endpoint Protection", "SNMP"]} />
          </InfoPanel>
          <InfoPanel title="Recent Alerts">
            <DataTable columns={["Issue", "Severity", "Time", "Status"]} rows={(recentAlerts.length ? recentAlerts : alerts.slice(0, 2)).map((alert) => [alert.issue, alert.severity, alert.time, <Badge key="status">{alert.status}</Badge>])} />
          </InfoPanel>
          <InfoPanel title="Linked Tickets">
            <DataTable columns={["Ticket", "Subject", "Priority", "Status"]} rows={(linkedTickets.length ? linkedTickets : tickets.slice(0, 2)).map((ticket) => [ticket.id, ticket.subject, ticket.priority, <Badge key="status">{ticket.status}</Badge>])} />
          </InfoPanel>
          <InfoPanel title="Backup Status">
            <DataTable columns={["Device", "Type", "Last Backup", "Next Backup", "Status"]} rows={backups.slice(0, 2).map((backup) => [backup.device, backup.type, backup.last, backup.next, <Badge key="status">{backup.status}</Badge>])} />
          </InfoPanel>
        </div>
        <Card>
          <h2 className="text-base font-semibold">Remote Actions</h2>
          <div className="mt-4 grid gap-3">
            {[
              ["Take Control", MonitorUp],
              ["Remote Terminal", Terminal],
              ["File Manager", FolderOpen],
              ["Run Script", Play],
              ["Reboot", RefreshCw],
              ["Shutdown", Power],
            ].map(([label, Icon]) => (
              <Button
                key={String(label)}
                variant={label === "Shutdown" ? "danger" : "secondary"}
                className="justify-start"
                disabled={["Take Control", "Remote Terminal", "File Manager"].includes(String(label))}
                title={["Take Control", "Remote Terminal", "File Manager"].includes(String(label)) ? "Remote control not configured" : undefined}
              >
                <Icon className="h-4 w-4" />
                {String(label)}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function NetworkDiscoveryPage() {
  return (
    <>
      <PageHeader title="Network Discovery" description="Scan customer ranges for firewalls, switches, routers, printers, NAS, UPS, access points, and servers before onboarding them." action={<Button><Play className="h-4 w-4" /> Start Scan</Button>} />
      <Card className="mb-5">
        <div className="grid gap-4 md:grid-cols-5">
          <Field label="Client"><Select defaultValue="DC Jewellers">{clients.map((client) => <option key={client.name}>{client.name}</option>)}</Select></Field>
          <Field label="Site"><Select defaultValue="Rajkot Retail">{sites.map((site) => <option key={site.name}>{site.name}</option>)}</Select></Field>
          <Field label="IP Range"><Input defaultValue="10.22.30.0/24" /></Field>
          <Field label="Scan Type"><Select defaultValue="SNMP Scan"><option>Ping Scan</option><option>Port Scan</option><option>SNMP Scan</option></Select></Field>
          <div className="flex items-end"><Button className="w-full"><Play className="h-4 w-4" /> Start Scan</Button></div>
        </div>
      </Card>
      <DataTable
        columns={["IP Address", "Hostname", "MAC Address", "Vendor", "Device Type", "Open Ports", "Status", "Action"]}
        rows={discoveryResults.map((item) => [item.ip, item.hostname, item.mac, item.vendor, item.type, item.ports, <Badge key="status">{item.status}</Badge>, <Button key="action" size="sm" variant="secondary"><Plus className="h-3.5 w-3.5" /> Add to Inventory</Button>])}
      />
    </>
  );
}

function AgentDeploymentPage() {
  const methods = ["Manual Installer", "GPO Deployment", "Intune Deployment", "PowerShell Script", "SSH Linux Install", "MeshAgent Deployment"];
  return (
    <>
      <PageHeader title="Agent Deployment" description="Generate staged installers, deployment scripts, and admin push workflows for Windows, Linux, and macOS devices." action={<Button><KeyRound className="h-4 w-4" /> Generate Installer</Button>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card>
          <h2 className="text-base font-semibold">Deployment Builder</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Select Client"><Select>{clients.map((client) => <option key={client.name}>{client.name}</option>)}</Select></Field>
            <Field label="Select Site"><Select>{sites.map((site) => <option key={site.name}>{site.name}</option>)}</Select></Field>
            <Field label="OS"><Select><option>Windows</option><option>Linux</option><option>macOS</option></Select></Field>
            <Field label="Device Type"><Select><option>Server</option><option>Workstation</option></Select></Field>
            <Field label="Token Expiration"><Select><option>24 Hours</option><option>7 Days</option><option>30 Days</option></Select></Field>
            <div className="flex items-end"><Button className="w-full"><Download className="h-4 w-4" /> Generate Installer</Button></div>
          </div>
        </Card>
        <Card>
          <h2 className="text-base font-semibold">Deployment Methods</h2>
          <div className="mt-4 grid gap-2">
            {methods.map((method) => <Button key={method} variant="secondary" className="justify-start"><CheckCircle2 className="h-4 w-4 text-success" /> {method}</Button>)}
          </div>
        </Card>
      </div>
      <Card className="mt-5">
        <h2 className="text-base font-semibold">Generated Install Command Mock</h2>
        <div className="mt-4 grid gap-3">
          <CodeLine>powershell -ExecutionPolicy Bypass -c "iwr https://agent.nscope.example/install.ps1 | iex -Token NSC-DEMO-24H"</CodeLine>
          <CodeLine>curl -fsSL https://agent.nscope.example/linux.sh | sudo bash -s -- --token NSC-DEMO-24H</CodeLine>
        </div>
      </Card>
    </>
  );
}

function RemoteAccessPage() {
  return (
    <>
      <PageHeader title="Remote Access" description="Remote desktop, terminal, and file manager sessions launched through MeshCentral." action={<Button><Activity className="h-4 w-4" /> View Sessions</Button>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {devices.slice(0, 6).map((device) => (
          <Card key={device.hostname}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{device.hostname}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{device.client} · {device.site}</p>
              </div>
              <Badge>{device.status}</Badge>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {["Take Control", "Remote Terminal", "File Manager"].map((action) => <Button key={action} variant="secondary" size="sm">{action}</Button>)}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function BackupRecoveryPage() {
  const stats = [
    ["Total Protected Devices", "212"],
    ["Successful Backups", "204"],
    ["Failed Backups", "4"],
    ["Backup Storage Used", "18.6 TB"],
    ["Last Backup Status", "Successful"],
    ["Backup Compliance %", "96%"],
  ];
  return (
    <>
      <PageHeader title="Backup & Recovery" description="Backup job visibility across endpoint, server, local, NAS, S3, Azure Blob, and archive targets." action={<Button><ArchiveRestore className="h-4 w-4" /> Restore Wizard</Button>} />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map(([label, value]) => <Metric key={label} label={label} value={value} />)}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <InfoPanel title="Backup Types"><PillRow values={["Full Backup", "Incremental Backup", "Differential Backup", "OS / Bare Metal Backup"]} /></InfoPanel>
        <InfoPanel title="Backup Targets"><PillRow values={["Local Storage", "NAS Storage", "AWS S3", "Azure Blob", "Glacier Archive"]} /></InfoPanel>
      </div>
      <div className="mt-5">
        <DataTable
          columns={["Device Name", "Backup Type", "Last Backup", "Next Scheduled Backup", "Backup Size", "Retention Policy", "Status", "Actions"]}
          rows={backups.map((backup) => [backup.device, backup.type, backup.last, backup.next, backup.size, backup.retention, <Badge key="status">{backup.status}</Badge>, <ActionStrip key="actions" actions={["Run Backup", "Restore", "View History", "Download Logs"]} />])}
        />
      </div>
    </>
  );
}

function MonitoringPage() {
  const severity = [["Critical", "6"], ["High", "13"], ["Medium", "31"], ["Low", "58"], ["Resolved", "142"]];
  return (
    <>
      <PageHeader title="Monitoring" description="Unified alert queue with severity triage, client context, ownership, and response status." action={<Button><Shield className="h-4 w-4" /> Acknowledge Selected</Button>} />
      <div className="grid gap-4 md:grid-cols-5">
        {severity.map(([label, value]) => <Metric key={label} label={label} value={value} />)}
      </div>
      <div className="mt-5">
        <DataTable
          columns={["Hostname", "Client", "Site", "Issue", "Severity", "Time", "Status", "Actions"]}
          rows={alerts.map((alert) => [alert.hostname, alert.client, alert.site, alert.issue, alert.severity, alert.time, <Badge key="status">{alert.status}</Badge>, <ActionStrip key="actions" actions={["Acknowledge", "Create Ticket", "Mute"]} />])}
        />
      </div>
    </>
  );
}

function AssetsPage() {
  return (
    <>
      <PageHeader title="Assets" description="Hardware and software ownership view for asset tags, serials, assigned users, warranty, and locations." action={<Button><Plus className="h-4 w-4" /> Add Asset</Button>} />
      <Toolbar />
      <DataTable
        columns={["Asset Tag", "Serial Number", "Device Type", "Client", "Site", "Assigned User", "Location", "Purchase Date", "Warranty Expiry", "Status"]}
        rows={assets.map((asset) => [asset.tag, asset.serial, asset.type, asset.client, asset.site, asset.user, asset.location, asset.purchase, asset.warranty, <Badge key="status">{asset.status}</Badge>])}
      />
    </>
  );
}

function TicketsPage() {
  return (
    <>
      <PageHeader title="Tickets" description="Service desk queue linked to client, site, device inventory, priority, SLA due time, engineer assignment, and activity." action={<Button><Plus className="h-4 w-4" /> Create Ticket</Button>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
        <DataTable
          columns={["Ticket ID", "Client", "Device", "Subject", "Priority", "Status", "Assigned Engineer", "Created Date", "SLA Due", "Actions"]}
          rows={tickets.map((ticket) => [<LinkButton key="ticket" href={`/tickets/${slugify(ticket.id)}`} variant="ghost" className="justify-start px-0 text-accent">{ticket.id}</LinkButton>, ticket.client, ticket.device, ticket.subject, ticket.priority, <Badge key="status">{ticket.status}</Badge>, ticket.engineer, ticket.created, ticket.due, <ActionStrip key="actions" actions={["View", "Assign", "Resolve"]} />])}
        />
        <Card>
          <h2 className="text-base font-semibold">Ticket Creation Form</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Select Client"><Select>{clients.map((client) => <option key={client.name}>{client.name}</option>)}</Select></Field>
            <Field label="Select Site"><Select>{sites.map((site) => <option key={site.name}>{site.name}</option>)}</Select></Field>
            <Field label="Select Device from inventory"><Select>{devices.map((device) => <option key={device.hostname}>{device.hostname}</option>)}</Select></Field>
            <Field label="Subject"><Input placeholder="Short issue summary" /></Field>
            <Field label="Description"><Textarea placeholder="Describe the problem or request" /></Field>
            <Field label="Priority"><Select><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></Select></Field>
            <Button variant="outline"><FileText className="h-4 w-4" /> Attachment Placeholder</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

function TicketDetailsPage({ ticketId }: { ticketId: string }) {
  const ticket = tickets.find((item) => item.id === ticketId) ?? tickets[0];
  const device = devices.find((item) => item.hostname === ticket.device) ?? devices[0];
  return (
    <>
      <PageHeader title={ticket.id} description={ticket.subject} action={<Badge>{ticket.status}</Badge>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <InfoPanel title="Ticket Information">
            <div className="grid gap-4 md:grid-cols-2">
              <Line label="Client" value={ticket.client} />
              <Line label="Device" value={ticket.device} />
              <Line label="Priority" value={ticket.priority} />
              <Line label="SLA Due" value={ticket.due} />
              <Line label="Assigned Engineer" value={ticket.engineer} />
              <Line label="Created Date" value={ticket.created} />
            </div>
          </InfoPanel>
          <InfoPanel title="Comments">
            <Timeline items={["Engineer acknowledged the issue.", "Client confirmed maintenance window.", "Remote diagnostics collected from linked device."]} />
          </InfoPanel>
          <InfoPanel title="Activity Timeline">
            <Timeline items={["Ticket created from monitoring alert.", "SLA clock started.", "Device inventory attached.", "Remote session requested."]} />
          </InfoPanel>
          <InfoPanel title="Resolution Notes">
            <Textarea defaultValue="Pending final validation from client contact." />
          </InfoPanel>
        </div>
        <Card>
          <h2 className="text-base font-semibold">Linked Device Details</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <Line label="Hostname" value={device.hostname} />
            <Line label="OS" value={device.os} />
            <Line label="IP Address" value={device.ip} />
            <Line label="Status" value={device.status} />
            <Line label="Last Seen" value={device.lastSeen} />
          </div>
        </Card>
      </div>
    </>
  );
}

function ClientPortalPage() {
  return (
    <>
      <PageHeader title="Client Portal" description="Client-scoped view showing only their company data: devices, tickets, assets, reports, and support creation." action={<Button><Plus className="h-4 w-4" /> Create Support Ticket</Button>} />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {["My Devices", "My Tickets", "My Assets", "My Reports", "Create Support Ticket", "Ticket Status"].map((label, index) => (
          <Metric key={label} label={label} value={index === 4 ? "New" : String([42, 3, 18, 7, 0, 3][index])} />
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <InfoPanel title="My Devices"><DataTable columns={["Hostname", "Site", "OS", "Status"]} rows={devices.filter((device) => device.client === "White Canvas Tech").map((device) => [device.hostname, device.site, device.os, <Badge key="status">{device.status}</Badge>])} /></InfoPanel>
        <InfoPanel title="My Tickets"><DataTable columns={["Ticket", "Subject", "Status", "SLA Due"]} rows={tickets.filter((ticket) => ticket.client === "White Canvas Tech").map((ticket) => [ticket.id, ticket.subject, <Badge key="status">{ticket.status}</Badge>, ticket.due])} /></InfoPanel>
      </div>
    </>
  );
}

function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Management-ready report library for inventory, compliance, alerts, SLA, backup, warranty, and monthly client reviews." action={<Button><Download className="h-4 w-4" /> Export Pack</Button>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportCards.map((report) => (
          <Card key={report}>
            <FileText className="h-6 w-6 text-accent" />
            <h2 className="mt-4 font-semibold">{report}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Preview, schedule, export PDF, or share with client portal.</p>
            <Button className="mt-5 w-full" variant="secondary">Open Report</Button>
          </Card>
        ))}
      </div>
    </>
  );
}

function SettingsPage() {
  const sections = ["Company Profile", "User Management", "Role Management", "Client Portal Settings", "Integration Settings", "Notification Settings", "Security Settings", "Audit Logs"];
  return (
    <>
      <PageHeader title="Settings" description="Administrative configuration for company profile, users, roles, portal access, integrations, security, notifications, and audits." action={<Button>Save Changes</Button>} />
      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <Card className="p-3">
          <div className="grid gap-1">
            {sections.map((section) => <Button key={section} variant="ghost" className="justify-start">{section}</Button>)}
          </div>
        </Card>
        <div className="space-y-5">
          <Card>
            <h2 className="text-base font-semibold">User Management</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Company Name"><Input defaultValue="N-SCOPE Netware Pvt Ltd" /></Field>
              <Field label="Default Timezone"><Select defaultValue="Asia/Kolkata"><option>Asia/Kolkata</option><option>UTC</option></Select></Field>
              <Field label="Notification Email"><Input defaultValue="noc@nscope.example" /></Field>
              <Field label="Security Policy"><Select><option>MFA Required</option><option>Password Only</option></Select></Field>
            </div>
            <h3 className="mt-6 text-sm font-semibold">User Roles</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {userRoles.map((role) => <Badge key={role}>{role}</Badge>)}
            </div>
          </Card>
          <LiveAuditLogsPanel />
        </div>
      </div>
    </>
  );
}

function Toolbar() {
  return (
    <Card className="mb-5 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex min-h-10 flex-1 items-center gap-2 rounded-md border bg-slate-50 px-3 text-sm text-slate-500 dark:bg-slate-900">
          Search current view
        </div>
        <Button variant="outline"><Filter className="h-4 w-4" /> Filters</Button>
        <Button variant="outline"><Download className="h-4 w-4" /> Export</Button>
      </div>
    </Card>
  );
}

function ActionStrip({ actions }: { actions: string[] }) {
  return (
    <div className="flex min-w-40 flex-wrap gap-1.5">
      {actions.slice(0, 3).map((action) => <Button key={action} size="sm" variant="secondary">{action}</Button>)}
      {actions.length > 3 && <Button size="icon" variant="ghost" title={actions.slice(3).join(", ")} aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{value}</p>
    </Card>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function PillRow({ values }: { values: string[] }) {
  return <div className="flex flex-wrap gap-2">{values.map((value) => <Badge key={value}>{value}</Badge>)}</div>;
}

function CodeLine({ children }: { children: React.ReactNode }) {
  return <code className="block overflow-x-auto rounded-md bg-slate-950 px-4 py-3 text-sm text-slate-100">{children}</code>;
}

function Timeline({ items }: { items: string[] }) {
  return (
    <ol className="grid gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
          {item}
        </li>
      ))}
    </ol>
  );
}
