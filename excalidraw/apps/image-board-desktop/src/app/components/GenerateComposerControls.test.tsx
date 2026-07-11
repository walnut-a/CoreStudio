import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  GenerateComposerModeBar,
  GenerateComposerSourceSelect,
} from "./GenerateComposerControls";

describe("GenerateComposerModeBar", () => {
  it("renders mode tabs and reports mode selection", () => {
    const onSelectMode = vi.fn();

    render(
      <GenerateComposerModeBar
        showModeSwitch={true}
        showModeIndicator={false}
        composerModeOptions={["direct", "acp"]}
        effectiveComposerMode="direct"
        onSelectMode={onSelectMode}
        onStopInputEvent={vi.fn()}
      />,
    );

    const tablist = screen.getByRole("tablist", { name: "输入模式" });
    expect(
      within(tablist).getByRole("tab", { name: "直接输入" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      within(tablist).getByRole("tab", { name: "ACP Agent" }),
    ).toHaveAttribute("aria-selected", "false");

    fireEvent.click(within(tablist).getByRole("tab", { name: "ACP Agent" }));

    expect(onSelectMode).toHaveBeenCalledWith("acp", expect.any(Object));
  });

  it("renders a fixed mode indicator when switching is hidden", () => {
    render(
      <GenerateComposerModeBar
        showModeSwitch={false}
        showModeIndicator={true}
        composerModeOptions={["agent", "direct"]}
        effectiveComposerMode="agent"
        onSelectMode={vi.fn()}
        onStopInputEvent={vi.fn()}
      />,
    );

    expect(screen.getByText("Agent 操作")).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "输入模式" })).toBeNull();
  });
});

describe("GenerateComposerSourceSelect", () => {
  it("renders a disabled status when Agent generation is unavailable", () => {
    render(
      <GenerateComposerSourceSelect
        visible={true}
        selectable={false}
        effectiveGenerationSource="builtin"
        label="直接生成"
        unavailableMessage="需要先配置 ACP Agent"
        resetKey="direct"
        onSelectSource={vi.fn()}
        onStopInputEvent={vi.fn()}
      />,
    );

    const status = screen.getByLabelText("生成方式");
    expect(status).toHaveTextContent("直接生成");
    expect(status).toHaveAttribute("title", "需要先配置 ACP Agent");
    expect(screen.queryByRole("listbox", { name: "生成方式" })).toBeNull();
  });

  it("opens source options and reports selected source", () => {
    const onSelectSource = vi.fn();

    render(
      <GenerateComposerSourceSelect
        visible={true}
        selectable={true}
        effectiveGenerationSource="builtin"
        label="直接生成"
        resetKey="direct"
        onSelectSource={onSelectSource}
        onStopInputEvent={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "生成方式" }));

    const listbox = screen.getByRole("listbox", { name: "生成方式" });
    expect(
      within(listbox).getByRole("option", { name: "直接生成" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      within(listbox).getByRole("option", { name: "ACP Agent" }),
    ).toHaveAttribute("aria-selected", "false");

    fireEvent.click(within(listbox).getByRole("option", { name: "ACP Agent" }));

    expect(onSelectSource).toHaveBeenCalledWith("agent", expect.any(Object));
    expect(screen.queryByRole("listbox", { name: "生成方式" })).toBeNull();
  });
});
