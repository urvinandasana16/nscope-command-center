import { apiRequest } from "@/lib/api";

export type DashboardSummary = {
  total_clients: number;
  total_sites: number;
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  warning_devices?: number;
  critical_devices?: number;
  open_tickets: number;
  critical_tickets: number;
  total_assets: number;
  engineer_workload?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    assigned_clients: number;
    assigned_sites: number;
    open_tickets: number;
  }>;
};

export async function getDashboardSummary(token?: string) {
  return apiRequest<DashboardSummary>("/dashboard/summary", { token });
}
