import { useCallback, useMemo, useState } from "react";

import {
  ACP_AGENT_CUSTOM_PRESET_ID,
  DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
  getAcpAgentPreset,
  getDefaultAcpAgentSettings,
  getSelectedAcpAgent,
  inferAcpAgentPresetId,
  normalizeAcpAgentSettings,
  normalizeAcpTaskInstructionTemplate,
  type AcpAgentConfig,
  type AcpAgentPresetId,
  type AcpAgentSettings,
} from "../../shared/acpTypes";
import { formatUnknownErrorMessage } from "../generationErrorViewModel";

import type { DesktopBridgeApi } from "../../shared/desktopBridgeTypes";

export interface AcpAgentSettingsDraft {
  enabled: boolean;
  presetId: AcpAgentPresetId;
  command: string;
  args: string;
  cwd: string;
  taskInstructionTemplate: string;
}

export interface AcpAgentSettingsController {
  settings: AcpAgentSettings;
  experimentalEnabled: boolean;
  selectedAgent: AcpAgentConfig | null;
  draft: AcpAgentSettingsDraft;
  saving: boolean;
  editable: boolean;
  load: () => Promise<void>;
  save: () => Promise<void>;
  setExperimentalEnabled: (enabled: boolean) => Promise<void>;
  setEnabledDraft: (enabled: boolean) => void;
  setPresetDraft: (presetId: AcpAgentPresetId) => void;
  setCommandDraft: (command: string) => void;
  setArgsDraft: (args: string) => void;
  setCwdDraft: (cwd: string) => void;
  setTaskInstructionDraft: (template: string) => void;
}

export const parseAcpAgentArgs = (value: string) =>
  value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const formatAcpAgentArgs = (args: readonly string[]) => args.join(" ");

const getAcpAgentDraftName = (presetId: AcpAgentPresetId) =>
  getAcpAgentPreset(presetId)?.name ?? "自定义 ACP Agent";

const createDraftFromSettings = (
  settings: AcpAgentSettings,
): AcpAgentSettingsDraft => {
  const normalizedSettings = normalizeAcpAgentSettings(settings);
  const agent =
    getSelectedAcpAgent(normalizedSettings) ??
    normalizedSettings.agents[0] ??
    null;
  const presetId = inferAcpAgentPresetId(agent);
  const preset = getAcpAgentPreset(presetId);

  return {
    enabled: normalizedSettings.enabled,
    presetId,
    command: agent?.command ?? preset?.command ?? "",
    args: formatAcpAgentArgs(agent?.args ?? preset?.args ?? []),
    cwd: agent?.cwd ?? preset?.cwd ?? "",
    taskInstructionTemplate:
      normalizedSettings.taskInstructionTemplate ??
      DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
  };
};

const createSettingsFromDraft = (
  draft: AcpAgentSettingsDraft,
  experimentalEnabled: boolean,
): AcpAgentSettings => {
  const command = draft.command.trim();
  const preset = getAcpAgentPreset(draft.presetId);

  return {
    experimentalEnabled,
    enabled: Boolean(draft.enabled && command),
    defaultAgentId: command ? "default" : null,
    taskInstructionTemplate: normalizeAcpTaskInstructionTemplate(
      draft.taskInstructionTemplate,
    ),
    agents: command
      ? [
          {
            id: "default",
            ...(preset ? { presetId: preset.id } : {}),
            name: getAcpAgentDraftName(draft.presetId),
            command,
            args: parseAcpAgentArgs(draft.args),
            cwd: draft.cwd.trim() || null,
          },
        ]
      : [],
  };
};

export const formatAcpAgentSettingsSaveError = (error: unknown) =>
  formatUnknownErrorMessage(error, "ACP Agent 设置保存失败。");

export const runAcpAgentSettingsSaveAction = async ({
  saveSettings,
  setProjectError,
}: {
  saveSettings: () => Promise<void>;
  setProjectError: (message: string) => void;
}) => {
  try {
    await saveSettings();
  } catch (error) {
    setProjectError(error instanceof Error ? error.message : String(error));
  }
};

export const createAcpAgentSettingsRendererActions = ({
  saveSettings,
  setProjectError,
}: {
  saveSettings: () => Promise<void>;
  setProjectError: (message: string) => void;
}) => ({
  save: () =>
    runAcpAgentSettingsSaveAction({
      saveSettings,
      setProjectError,
    }),
});

export const useAcpAgentSettingsController = (
  bridge: DesktopBridgeApi | null,
): AcpAgentSettingsController => {
  const [settings, setSettings] = useState<AcpAgentSettings>(() =>
    getDefaultAcpAgentSettings(),
  );
  const [draft, setDraft] = useState<AcpAgentSettingsDraft>(() =>
    createDraftFromSettings(getDefaultAcpAgentSettings()),
  );
  const [saving, setSaving] = useState(false);

  const syncDraftFromSettings = useCallback((nextSettings: AcpAgentSettings) => {
    const normalizedSettings = normalizeAcpAgentSettings(nextSettings);
    setSettings(normalizedSettings);
    setDraft(createDraftFromSettings(normalizedSettings));
  }, []);

  const load = useCallback(async () => {
    if (!bridge?.loadAcpAgentSettings) {
      syncDraftFromSettings(getDefaultAcpAgentSettings());
      return;
    }

    try {
      syncDraftFromSettings(await bridge.loadAcpAgentSettings());
    } catch {
      syncDraftFromSettings(getDefaultAcpAgentSettings());
    }
  }, [bridge, syncDraftFromSettings]);

  const save = useCallback(async () => {
    if (!bridge?.saveAcpAgentSettings) {
      throw new Error("当前环境不能保存 ACP Agent 设置。");
    }

    const nextSettings = createSettingsFromDraft(
      draft,
      settings.experimentalEnabled === true,
    );
    setSaving(true);
    try {
      syncDraftFromSettings(await bridge.saveAcpAgentSettings(nextSettings));
    } catch (error) {
      throw new Error(formatAcpAgentSettingsSaveError(error));
    } finally {
      setSaving(false);
    }
  }, [bridge, draft, settings.experimentalEnabled, syncDraftFromSettings]);

  const setExperimentalEnabled = useCallback(
    async (enabled: boolean) => {
      if (!bridge?.saveAcpAgentSettings) {
        throw new Error("当前环境不能保存 ACP 实验性设置。");
      }
      setSaving(true);
      try {
        syncDraftFromSettings(
          await bridge.saveAcpAgentSettings({
            ...settings,
            experimentalEnabled: enabled,
          }),
        );
      } catch (error) {
        throw new Error(formatAcpAgentSettingsSaveError(error));
      } finally {
        setSaving(false);
      }
    },
    [bridge, settings, syncDraftFromSettings],
  );

  const selectedAgent = useMemo(
    () => getSelectedAcpAgent(settings),
    [settings],
  );

  const setPresetDraft = useCallback((presetId: AcpAgentPresetId) => {
    setDraft((current) => {
      const preset = getAcpAgentPreset(presetId);
      if (!preset) {
        return {
          ...current,
          presetId,
        };
      }

      return {
        ...current,
        presetId,
        command: preset.command,
        args: formatAcpAgentArgs(preset.args),
        cwd: preset.cwd ?? "",
      };
    });
  }, []);

  const setCommandDraft = useCallback((command: string) => {
    setDraft((current) => ({
      ...current,
      presetId: ACP_AGENT_CUSTOM_PRESET_ID,
      command,
    }));
  }, []);

  return {
    settings,
    experimentalEnabled: settings.experimentalEnabled === true,
    selectedAgent,
    draft,
    saving,
    editable: Boolean(bridge?.saveAcpAgentSettings),
    load,
    save,
    setExperimentalEnabled,
    setEnabledDraft: (enabled) =>
      setDraft((current) => ({
        ...current,
        enabled,
      })),
    setPresetDraft,
    setCommandDraft,
    setArgsDraft: (args) =>
      setDraft((current) => ({
        ...current,
        args,
      })),
    setCwdDraft: (cwd) =>
      setDraft((current) => ({
        ...current,
        cwd,
      })),
    setTaskInstructionDraft: (taskInstructionTemplate) =>
      setDraft((current) => ({
        ...current,
        taskInstructionTemplate,
      })),
  };
};
