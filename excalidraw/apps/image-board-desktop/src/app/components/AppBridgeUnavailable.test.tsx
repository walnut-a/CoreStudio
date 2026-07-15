import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setActiveDesktopLocale } from "../copy";
import { AppBridgeUnavailable } from "./AppBridgeUnavailable";

vi.mock("./AgentBoard", () => new Promise(() => undefined));

describe("AppBridgeUnavailable", () => {
  beforeEach(() => {
    setActiveDesktopLocale("en");
  });

  it("localizes the Agent Board loading fallback", () => {
    render(<AppBridgeUnavailable isAgentBrowserRoute />);

    expect(
      screen.getByRole("heading", { name: "Loading built-in board" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Please wait while CoreStudio prepares Agent Board."),
    ).toBeInTheDocument();
  });
});
