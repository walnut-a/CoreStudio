import { describe, expect, it } from "vitest";

import {
  assertActiveAgentProjectPath,
  createActiveAgentProjectPathRendererActions,
} from "./agentCommandRuntimeShared";

describe("agentCommandRuntimeShared", () => {
  it("allows commands without an expected project path", () => {
    expect(() =>
      assertActiveAgentProjectPath({
        expectedProjectPath: undefined,
        activeProjectPath: "/tmp/current-project",
      }),
    ).not.toThrow();
  });

  it("allows commands when the active project matches the expected path", () => {
    expect(() =>
      assertActiveAgentProjectPath({
        expectedProjectPath: "/tmp/current-project",
        activeProjectPath: "/tmp/current-project",
      }),
    ).not.toThrow();
  });

  it("throws a structured project mismatch error when the active project changed", () => {
    let thrown: unknown;
    try {
      assertActiveAgentProjectPath({
        expectedProjectPath: "/tmp/original-project",
        activeProjectPath: "/tmp/current-project",
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: "PROJECT_MISMATCH",
      message: "Agent command projectPath 与当前项目不一致。",
    });
  });

  it("creates a renderer assertion that reads the latest active project path", () => {
    let activeProjectPath = "/tmp/original-project";
    const actions = createActiveAgentProjectPathRendererActions({
      getActiveProjectPath: () => activeProjectPath,
    });

    expect(() =>
      actions.assertActiveProject("/tmp/original-project"),
    ).not.toThrow();

    activeProjectPath = "/tmp/current-project";
    let thrown: unknown;
    try {
      actions.assertActiveProject("/tmp/original-project");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: "PROJECT_MISMATCH",
    });
  });
});
