import { useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch } from "../../lib/api";
import type { ActivityView, CommentView, ListMeta, TicketCategory, TicketPriority, TicketView } from "../../lib/types";

export interface ListParams {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  page: number;
}

export const fetchTickets = (params: ListParams) =>
  apiFetch<TicketView[], ListMeta>("/api/tickets", { query: { ...params } });

export const fetchTicket = (id: string) => apiFetch<TicketView>(`/api/tickets/${id}`).then((r) => r.data);

export const fetchComments = (id: string) =>
  apiFetch<CommentView[]>(`/api/tickets/${id}/comments`).then((r) => r.data);

export const fetchActivity = (id: string) =>
  apiFetch<ActivityView[]>(`/api/tickets/${id}/activity`).then((r) => r.data);

export interface NewTicket {
  title: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
}

export const createTicket = (body: NewTicket) =>
  apiFetch<TicketView>("/api/tickets", { method: "POST", body }).then((r) => r.data);

export const updateTicket = (id: string, body: Partial<Pick<NewTicket, "title" | "description" | "category">>) =>
  apiFetch<TicketView>(`/api/tickets/${id}`, { method: "PATCH", body }).then((r) => r.data);

export const postComment = (id: string, body: string) =>
  apiFetch<CommentView>(`/api/tickets/${id}/comments`, { method: "POST", body: { body } }).then((r) => r.data);

// The API answers DELETE with 204 and no body, which apiFetch reports as an ApiError with status 204.
export async function deleteTicket(id: string): Promise<void> {
  try {
    await apiFetch(`/api/tickets/${id}`, { method: "DELETE" });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 204)) throw err;
  }
}

// Invalidates every cache a ticket change can touch. PR9's admin controls call it after their PATCH.
export function useInvalidateTicket() {
  const qc = useQueryClient();
  return (id: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["ticket", id] }),
      qc.invalidateQueries({ queryKey: ["comments", id] }),
      qc.invalidateQueries({ queryKey: ["activity", id] }),
      qc.invalidateQueries({ queryKey: ["tickets"] }),
    ]);
}
