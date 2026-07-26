import { describe, expect, it } from "vitest";

import {
  buildDesktopProjectRendererUrl,
  buildDesktopShellRendererUrl,
  parseDesktopRendererRoute,
} from "./desktopRendererRoute";

describe("desktop renderer route", () => {
  it("defaults to the existing app route outside desktop shell URLs", () => {
    expect(
      parseDesktopRendererRoute("http://127.0.0.1:60909/board/board-id"),
    ).toEqual({ mode: "app" });
  });

  it("parses a shell route without project identity", () => {
    expect(
      parseDesktopRendererRoute("http://127.0.0.1:5174/?desktopMode=shell"),
    ).toEqual({ mode: "shell" });
  });

  it("requires one explicit project path for a project renderer", () => {
    expect(
      parseDesktopRendererRoute(
        "http://127.0.0.1:5174/?desktopMode=project&projectPath=%2Fprojects%2Fa",
      ),
    ).toEqual({ mode: "project", projectPath: "/projects/a" });
    expect(() =>
      parseDesktopRendererRoute("http://127.0.0.1:5174/?desktopMode=project"),
    ).toThrow("Project renderer route requires a project path.");
  });

  it("builds stable shell and project renderer URLs", () => {
    expect(buildDesktopShellRendererUrl("http://127.0.0.1:5174/")).toBe(
      "http://127.0.0.1:5174/?desktopMode=shell",
    );
    expect(
      buildDesktopProjectRendererUrl(
        "http://127.0.0.1:5174/",
        "/projects/中文 A",
      ),
    ).toBe(
      "http://127.0.0.1:5174/?desktopMode=project&projectPath=%2Fprojects%2F%E4%B8%AD%E6%96%87+A",
    );
  });
});
