import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { AuthContext, type AuthState } from "./AuthContext";
import { RequireRole } from "./guards";
import type { PublicUser } from "../lib/types";

function renderAs(user: PublicUser) {
  const auth: AuthState = {
    user,
    loading: false,
    login: async () => user,
    register: async () => user,
    logout: () => {},
  };
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireRole role="ADMIN">
                <p>admin area</p>
              </RequireRole>
            }
          />
          <Route path="/tickets" element={<p>tickets page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const base = { id: "1", name: "N", email: "n@example.com" };

describe("RequireRole", () => {
  it("redirects a USER to /tickets", () => {
    renderAs({ ...base, role: "USER" });
    expect(screen.getByText("tickets page")).toBeInTheDocument();
    expect(screen.queryByText("admin area")).not.toBeInTheDocument();
  });

  it("renders children for an ADMIN", () => {
    renderAs({ ...base, role: "ADMIN" });
    expect(screen.getByText("admin area")).toBeInTheDocument();
  });
});
