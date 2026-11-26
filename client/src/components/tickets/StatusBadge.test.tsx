import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("shows the human label, not the enum value", () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.queryByText("IN_PROGRESS")).not.toBeInTheDocument();
  });
});
