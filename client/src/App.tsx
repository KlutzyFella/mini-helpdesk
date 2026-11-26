import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "./auth/AuthContext";
import { RequireAuth, RequireRole, homeFor } from "./auth/guards";
import { Layout } from "./components/Layout";
import { AdminTicketDetail } from "./pages/admin/AdminTicketDetail";
import { AdminTickets } from "./pages/admin/AdminTickets";
import { Login } from "./pages/Login";
import { Placeholder } from "./pages/Placeholder";
import { Register } from "./pages/Register";
import { MyTickets } from "./pages/tickets/MyTickets";
import { NewTicket } from "./pages/tickets/NewTicket";
import { TicketDetail } from "./pages/tickets/TicketDetail";

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homeFor(user.role) : "/login"} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<RootRedirect />} />
          <Route element={<RequireRole role="USER" />}>
            <Route path="/tickets" element={<MyTickets />} />
            <Route path="/tickets/new" element={<NewTicket />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
          </Route>
          <Route element={<RequireRole role="ADMIN" />}>
            <Route path="/admin" element={<Navigate to="/admin/tickets" replace />} />
            <Route path="/admin/tickets" element={<AdminTickets />} />
            <Route path="/admin/tickets/:id" element={<AdminTicketDetail />} />
          </Route>
          <Route path="*" element={<Placeholder name="Not found" />} />
        </Route>
      </Route>
    </Routes>
  );
}
