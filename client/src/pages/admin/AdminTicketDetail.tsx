import { TicketTriage } from "../../components/admin/TicketTriage";
import { TicketDetail } from "../tickets/TicketDetail";

export function AdminTicketDetail() {
  return (
    <TicketDetail
      adminControls={(t) => <TicketTriage ticket={t} />}
      backTo="/admin/tickets"
      backLabel="Back to all tickets"
    />
  );
}
