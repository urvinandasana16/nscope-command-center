"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Building2, Clock, Laptop, MapPin, RefreshCw, ShieldAlert, Ticket } from "lucide-react";
import { getDashboardSummary, type DashboardSummary } from "@/services/dashboardService";
import { listDevices } from "@/services/deviceService";
import { deriveDeviceStatus, displayStatus } from "@/lib/device-format";
import { Badge, Button, Card, DataTable, PageHeader, StatCard } from "./ui/primitives";

const emptySummary: DashboardSummary = {
  total_clients: 0,
  total_sites: 0,
  total_devices: 0,
  online_devices: 0,
  offline_devices: 0,
  warning_devices: 0,
  critical_devices: 0,
  open_tickets: 0,
  critical_tickets: 0,
  total_assets: 0,
};

type DashboardDevice = {
  id: string;
  hostname: string;
  client?: { name?: string };
  site?: { name?: string };
  status?: string;
  derivedStatus?: string;
  lastSeen?: string;
  lastUninstalledAt?: string;
  agentVersion?: string;
};

export function LiveDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [devices, setDevices] = useState<DashboardDevice[]>([]);
  const [status, setStatus] = useState("Loading live dashboard data...");

  async function load() {
    setStatus("Loading live dashboard data...");
    try {
      const [data, deviceData] = await Promise.all([
        getDashboardSummary(),
        listDevices().catch(() => []),
      ]);
      setSummary(data);
      setDevices(deviceData as DashboardDevice[]);
      setStatus("Live API data");
    } catch (error) {
      setSummary(emptySummary);
      setDevices([]);
      setStatus(error instanceof Error ? error.message : "Unable to load dashboard API data.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = [
    { label: "Total Clients", value: String(summary.total_clients), change: status, icon: Building2 },
    { label: "Total Sites", value: String(summary.total_sites), change: "Managed locations", icon: MapPin },
    { label: "Online Agents", value: String(summary.online_devices), change: "Reporting now", icon: Activity },
    { label: "Offline Agents", value: String(summary.offline_devices), change: "Need attention", icon: Laptop },
    { label: "Warning Devices", value: String(summary.warning_devices ?? 0), change: "Watch list", icon: AlertTriangle },
    { label: "Critical Devices", value: String(summary.critical_devices ?? 0), change: "Immediate response", icon: ShieldAlert },
    { label: "Open Tickets", value: String(summary.open_tickets), change: `${summary.critical_tickets} critical`, icon: Ticket },
  ];
  const recentCheckIns = [...devices]
    .filter((device) => device.lastSeen)
    .sort((a, b) => new Date(b.lastSeen ?? 0).getTime() - new Date(a.lastSeen ?? 0).getTime())
    .slice(0, 6);
  const healthRows = [
    ["Online", summary.online_devices, "Online"],
    ["Warning", summary.warning_devices ?? 0, "Warning"],
    ["Critical", summary.critical_devices ?? 0, "Critical"],
    ["Offline", summary.offline_devices, "Offline"],
  ] as const;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Real-time operating view across client estates, device health, alert volume, ticket workload, backup posture, and remote activity."
        action={<Button onClick={load}><RefreshCw className="h-4 w-4" /> Refresh Data</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent Agent Check-ins</h2>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <DataTable
            columns={["Status", "Hostname", "Client", "Site", "Last Seen", "Agent"]}
            emptyMessage="No agent check-ins yet. Deploy your first agent."
            rows={recentCheckIns.map((device) => [
              <Badge key="status">{displayStatus(deriveDeviceStatus(device))}</Badge>,
              device.hostname,
              device.client?.name ?? "-",
              device.site?.name ?? "-",
              formatDate(device.lastSeen),
              device.agentVersion ?? "-",
            ])}
          />
        </Card>

        <div className="grid gap-4">
          <Card>
            <h2 className="mb-3 text-base font-semibold">Device Health Summary</h2>
            <div className="grid gap-2">
              {healthRows.map(([label, value, badge]) => (
                <div key={label} className="flex items-center justify-between rounded-md border px-3 py-2 dark:border-slate-800">
                  <Badge>{badge}</Badge>
                  <span className="text-lg font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 text-base font-semibold">Recent Alerts</h2>
            <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Alert ingestion is ready for monitoring events.
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}
