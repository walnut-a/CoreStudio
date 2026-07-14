import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExperimentalFeaturesSettingsSection } from "./ExperimentalFeaturesSettingsSection";

describe("ExperimentalFeaturesSettingsSection", () => {
  it("explains and toggles the external Agent experiment", () => {
    const onAcpEnabledChange = vi.fn();

    render(
      <ExperimentalFeaturesSettingsSection
        acpEnabled={false}
        disabled={false}
        saving={false}
        onAcpEnabledChange={onAcpEnabledChange}
      />,
    );

    expect(screen.getByText("实验性功能")).toBeInTheDocument();
    expect(screen.getByText("外部 Agent（ACP）")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("switch", { name: "启用外部 Agent 实验功能" }),
    );
    expect(onAcpEnabledChange).toHaveBeenCalledWith(true);
  });
});
