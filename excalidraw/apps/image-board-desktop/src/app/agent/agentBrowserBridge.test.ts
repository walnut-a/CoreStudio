import { describe, expect, it } from "vitest";

import {
  buildAgentBrowserBridgeConfig,
  buildAgentBrowserProjectTokenHref,
  buildAgentBrowserRouteState,
} from "./agentBrowserBridge";

describe("buildAgentBrowserRouteState", () => {
  it("detects the Agent Board route and project token", () => {
    expect(
      buildAgentBrowserRouteState({
        pathname: "/agent-board",
        href: "http://127.0.0.1:5174/agent-board?projectToken=project-token",
      }),
    ).toEqual({
      isAgentBrowserRoute: true,
      hasInitialProjectToken: true,
    });
  });

  it("keeps the legacy token query parameter supported", () => {
    expect(
      buildAgentBrowserRouteState({
        pathname: "/agent-board",
        href: "http://127.0.0.1:5174/agent-board?token=legacy-token",
      }),
    ).toEqual({
      isAgentBrowserRoute: true,
      hasInitialProjectToken: true,
    });
  });

  it("does not parse project tokens outside the Agent Board route", () => {
    expect(
      buildAgentBrowserRouteState({
        pathname: "/",
        href: "http://127.0.0.1:5174/?projectToken=project-token",
      }),
    ).toEqual({
      isAgentBrowserRoute: false,
      hasInitialProjectToken: false,
    });
  });
});

describe("buildAgentBrowserBridgeConfig", () => {
  it("normalizes the Agent Bridge URL and keeps the project token", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/agent-board",
        href: "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909%2F%2F&projectToken=project-token",
      }),
    ).toEqual({
      bridge: "http://127.0.0.1:60909",
      token: "project-token",
    });
  });

  it("keeps the legacy token query parameter supported", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/agent-board",
        href: "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&token=legacy-token",
      }),
    ).toEqual({
      bridge: "http://127.0.0.1:60909",
      token: "legacy-token",
    });
  });

  it("does not create a bridge config outside the Agent Board route", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/",
        href: "http://127.0.0.1:5174/?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectToken=project-token",
      }),
    ).toBeNull();
  });

  it("requires the local bridge query parameter", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/agent-board",
        href: "http://127.0.0.1:5174/agent-board?projectToken=project-token",
      }),
    ).toBeNull();
  });
});

describe("buildAgentBrowserProjectTokenHref", () => {
  it("writes the project token into the current Agent Board URL", () => {
    const href = buildAgentBrowserProjectTokenHref({
      href: "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
      token: "project-token",
    });

    const url = new URL(href);
    expect(url.pathname).toBe("/agent-board");
    expect(url.searchParams.get("bridge")).toBe("http://127.0.0.1:60909");
    expect(url.searchParams.get("projectToken")).toBe("project-token");
  });

  it("replaces an existing project token without dropping other query parameters", () => {
    const href = buildAgentBrowserProjectTokenHref({
      href: "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectToken=old-token&view=compact",
      token: "new-token",
    });

    const url = new URL(href);
    expect(url.searchParams.get("bridge")).toBe("http://127.0.0.1:60909");
    expect(url.searchParams.get("projectToken")).toBe("new-token");
    expect(url.searchParams.get("view")).toBe("compact");
  });
});
