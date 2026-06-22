import { apiRequest } from "@/lib/api";

export type AuditLog = {
  id: string;
  action: string;
  module: string;
  description: string;
  ipAddress?: string | null;
  createdAt?: string;
  user?: { name: string; email: string } | null;
};

export async function listAuditLogs() {
  return apiRequest<AuditLog[]>("/audit-logs");
}
