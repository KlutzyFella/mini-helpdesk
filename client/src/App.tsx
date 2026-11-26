import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "./auth/AuthContext";
import { RequireAuth, RequireRole, homeFor } from "./auth/guards";
import { Layout } from "./components/Layout";
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

// PR8 and PR9 swap the Placeholder element on one line per route.
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
            <Route path="/admin" element={<Placeholder name="Admin dashboard" />} />
            <Route path="/admin/tickets" element={<Placeholder name="All tickets" />} />
          </Route>
          <Route path="*" element={<Placeholder name="Not found" />} />
        </Route>
      </Route>
    </Routes>
  );
}
