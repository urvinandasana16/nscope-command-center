import { apiRequest } from "@/lib/api";

export async function listTickets() {
  return apiRequest("/tickets");
}

export async function getTicket(id: string) {
  return apiRequest(`/tickets/${id}`);
}

export async function createTicket(data: unknown) {
  return apiRequest("/tickets", { method: "POST", body: JSON.stringify(data) });
}

export async function updateTicket(id: string, data: unknown) {
  return apiRequest(`/tickets/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteTicket(id: string) {
  return apiRequest(`/tickets/${id}`, { method: "DELETE" });
}

export async function addTicketComment(id: string, comment: string) {
  return apiRequest(`/tickets/${id}/comments`, { method: "POST", body: JSON.stringify({ comment }) });
}
