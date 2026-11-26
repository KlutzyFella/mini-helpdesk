import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { useTicketListParams } from "./useTicketListParams";

type Hook = ReturnType<typeof useTicketListParams>;

function setup(initialUrl = "/admin/tickets") {
  const visits: { key: string; search: string }[] = [];
  const hook: { current: Hook | null } = { current: null };

  function Probe() {
    hook.current = useTicketListParams();
    const location = useLocation();
    useEffect(() => {
      visits.push({ key: location.key, search: location.search });
    }, [location.key, location.search]);
    return null;
  }

  render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Probe />
    </MemoryRouter>,
  );
  return { visits, hook: () => hook.current as Hook };
}

describe("useTicketListParams", () => {
  // A navigation the user did not cause writes back the URL from the previous render,
  // which can erase a filter chosen in the same moment.
  it("navigates exactly once per filter change", async () => {
    const { visits, hook } = setup();

    act(() => hook().setFilters({ status: "OPEN" }));
    await new Promise((r) => setTimeout(r, 50));
    act(() => hook().setFilters({ priority: "HIGH" }));
    await new Promise((r) => setTimeout(r, 50));

    expect(visits.map((v) => v.search)).toEqual(["", "?status=OPEN", "?status=OPEN&priority=HIGH"]);
    expect(hook().filterValues).toMatchObject({ status: "OPEN", priority: "HIGH" });
  });

  it("keeps both filters when they change before a re-render", async () => {
    const { visits, hook } = setup();
    const { setFilters } = hook();

    act(() => {
      setFilters({ status: "OPEN" });
      setFilters({ priority: "HIGH" });
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(visits.at(-1)?.search).toBe("?status=OPEN&priority=HIGH");
  });

  it("writes the search to the URL once, after the debounce", async () => {
    const { visits, hook } = setup("/admin/tickets?status=OPEN");

    act(() => hook().setFilters({ search: "vpn" }));
    expect(hook().filterValues.search).toBe("vpn");
    expect(visits.at(-1)?.search).toBe("?status=OPEN");

    await waitFor(() => expect(visits.at(-1)?.search).toBe("?status=OPEN&search=vpn"));
    await new Promise((r) => setTimeout(r, 400));
    expect(visits.map((v) => v.search)).toEqual(["?status=OPEN", "?status=OPEN&search=vpn"]);
  });
});
