import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ACP_AGENT_CUSTOM_PRESET_ID,
  DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
  type AcpAgentPresetId,
  type AcpAgentSettings,
} from "../../shared/acpTypes";
import {
  createAcpAgentSettingsRendererActions,
  runAcpAgentSettingsSaveAction,
  useAcpAgentSettingsController,
} from "./useAcpAgentSettingsController";

import type { DesktopBridgeApi } from "../../shared/desktopBridgeTypes";

let controller:
  | ReturnType<typeof useAcpAgentSettingsController>
  | null = null;

const ControllerProbe = ({
  bridge,
}: {
  bridge: DesktopBridgeApi | null;
}) => {
  controller = useAcpAgentSettingsController(bridge);
  return (
    <output data-testid="state">
      {JSON.stringify({
        enabled: controller.draft.enabled,
        presetId: controller.draft.presetId,
        command: controller.draft.command,
        args: controller.draft.args,
        cwd: controller.draft.cwd,
        taskInstructionTemplate: controller.draft.taskInstructionTemplate,
        selectedAgentName: controller.selectedAgent?.name ?? null,
        saving: controller.saving,
        editable: controller.editable,
      })}
    </output>
  );
};

const getState = () =>
  JSON.parse(screen.getByTestId("state").textContent ?? "{}") as {
    enabled: boolean;
    presetId: AcpAgentPresetId;
    command: string;
    args: string;
    cwd: string;
    taskInstructionTemplate: string;
    selectedAgentName: string | null;
    saving: boolean;
    editable: boolean;
  };

describe("useAcpAgentSettingsController", () => {
  it("loads defaults when the bridge has no ACP settings capability", async () => {
    render(<ControllerProbe bridge={{} as DesktopBridgeApi} />);

    await act(async () => {
      await controller?.load();
    });

    expect(getState()).toMatchObject({
      enabled: false,
      presetId: "codex-acp",
      command: "npx",
      args: "-y @agentclientprotocol/codex-acp",
      cwd: "",
      taskInstructionTemplate: DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
      selectedAgentName: null,
      editable: false,
    });
  });

  it("syncs an existing selected agent into the editable draft", async () => {
    const bridge = {
      loadAcpAgentSettings: vi.fn(async (): Promise<AcpAgentSettings> => ({
        enabled: true,
        defaultAgentId: "agent-1",
        taskInstructionTemplate: "请按项目规则写回。",
        agents: [
          {
            id: "agent-1",
            presetId: "gemini-cli",
            name: "Gemini CLI",
            command: "gemini",
            args: ["--acp"],
            cwd: "/tmp/project",
          },
        ],
      })),
      saveAcpAgentSettings: vi.fn(),
    } as unknown as DesktopBridgeApi;

    render(<ControllerProbe bridge={bridge} />);

    await act(async () => {
      await controller?.load();
    });

    expect(getState()).toMatchObject({
      enabled: true,
      presetId: "gemini-cli",
      command: "gemini",
      args: "--acp",
      cwd: "/tmp/project",
      taskInstructionTemplate: "请按项目规则写回。",
      selectedAgentName: "Gemini CLI",
      editable: true,
    });
  });

  it("updates the draft from presets and saves a normalized custom agent", async () => {
    const saveAcpAgentSettings = vi.fn(
      async (settings: AcpAgentSettings) => settings,
    );
    const bridge = {
      saveAcpAgentSettings,
    } as unknown as DesktopBridgeApi;

    render(<ControllerProbe bridge={bridge} />);

    act(() => {
      controller?.setPresetDraft("gemini-cli");
    });

    expect(getState()).toMatchObject({
      presetId: "gemini-cli",
      command: "gemini",
      args: "--acp",
    });

    act(() => {
      controller?.setEnabledDraft(true);
      controller?.setCommandDraft("/usr/local/bin/custom-acp");
      controller?.setArgsDraft(" --stdio   --debug ");
      controller?.setCwdDraft(" /tmp/corestudio ");
      controller?.setTaskInstructionDraft("  ");
    });

    expect(getState()).toMatchObject({
      presetId: ACP_AGENT_CUSTOM_PRESET_ID,
      command: "/usr/local/bin/custom-acp",
    });

    await act(async () => {
      await controller?.save();
    });

    await waitFor(() => {
      expect(saveAcpAgentSettings).toHaveBeenCalledWith({
        enabled: true,
        defaultAgentId: "default",
        taskInstructionTemplate: DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
        agents: [
          {
            id: "default",
            name: "自定义 ACP Agent",
            command: "/usr/local/bin/custom-acp",
            args: ["--stdio", "--debug"],
            cwd: "/tmp/corestudio",
          },
        ],
      });
    });
  });

  it("formats save failures with the controller owner fallback", async () => {
    const bridge = {
      saveAcpAgentSettings: vi.fn(async () => {
        throw null;
      }),
    } as unknown as DesktopBridgeApi;

    render(<ControllerProbe bridge={bridge} />);

    let saveError: unknown = null;
    await act(async () => {
      try {
        await controller?.save();
      } catch (error) {
        saveError = error;
      }
    });

    expect(saveError).toMatchObject({
      message: "ACP Agent 设置保存失败。",
    });
  });
});

describe("runAcpAgentSettingsSaveAction", () => {
  it("sets the formatted save error when saving fails", async () => {
    const setProjectError = vi.fn();

    await runAcpAgentSettingsSaveAction({
      saveSettings: vi.fn(async () => {
        throw new Error("ACP Agent 设置保存失败。");
      }),
      setProjectError,
    });

    expect(setProjectError).toHaveBeenCalledWith("ACP Agent 设置保存失败。");
  });

  it("does not update project errors when saving succeeds", async () => {
    const setProjectError = vi.fn();

    await runAcpAgentSettingsSaveAction({
      saveSettings: vi.fn(async () => undefined),
      setProjectError,
    });

    expect(setProjectError).not.toHaveBeenCalled();
  });
});

describe("createAcpAgentSettingsRendererActions", () => {
  it("creates a save handler that reports save failures through the project error surface", async () => {
    const setProjectError = vi.fn();
    const save = vi.fn(async () => {
      throw new Error("ACP Agent 设置保存失败。");
    });
    const actions = createAcpAgentSettingsRendererActions({
      saveSettings: save,
      setProjectError,
    });

    await actions.save();

    expect(save).toHaveBeenCalledTimes(1);
    expect(setProjectError).toHaveBeenCalledWith("ACP Agent 设置保存失败。");
  });
});
