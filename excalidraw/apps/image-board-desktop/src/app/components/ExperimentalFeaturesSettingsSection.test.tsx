import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExperimentalFeaturesSettingsSection } from "./ExperimentalFeaturesSettingsSection";

describe("ExperimentalFeaturesSettingsSection", () => {
  it("关闭时只显示用途和唯一开关", () => {
    render(
      <ExperimentalFeaturesSettingsSection
        acpEnabled={false}
        disabled={false}
        saving={false}
        presetId="codex-acp"
        onAcpEnabledChange={vi.fn()}
        onPresetChange={vi.fn()}
        onOpenAdvanced={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("switch")).toHaveLength(1);
    expect(screen.queryByLabelText("Agent 类型")).toBeNull();
    expect(screen.queryByRole("button", { name: "高级配置" })).toBeNull();
  });

  it("开启后显示 Agent 类型和高级配置入口", () => {
    const onPresetChange = vi.fn();
    const onOpenAdvanced = vi.fn();
    render(
      <ExperimentalFeaturesSettingsSection
        acpEnabled
        disabled={false}
        saving={false}
        presetId="codex-acp"
        onAcpEnabledChange={vi.fn()}
        onPresetChange={onPresetChange}
        onOpenAdvanced={onOpenAdvanced}
      />,
    );

    fireEvent.change(screen.getByLabelText("Agent 类型"), {
      target: { value: "gemini-cli" },
    });
    fireEvent.click(screen.getByRole("button", { name: "高级配置" }));

    expect(onPresetChange).toHaveBeenCalledWith("gemini-cli");
    expect(onOpenAdvanced).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("命令")).toBeNull();
  });
});
