import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WelcomePane } from "./WelcomePane";

describe("WelcomePane", () => {
  it("keeps the Agent integration switch as a lightweight global entry", () => {
    const onAgentAccessToggle = vi.fn();

    render(
      <WelcomePane
        loading={false}
        onCreateProject={vi.fn()}
        onOpenProject={vi.fn()}
        agentAccessEnabled={false}
        onAgentAccessToggle={onAgentAccessToggle}
      />,
    );

    expect(screen.getByText("Agent 集成")).toBeInTheDocument();
    expect(
      screen.getByText("允许本机 Agent 通过网页画布和 CLI 连接本地项目。"),
    ).toBeInTheDocument();
    expect(screen.queryByText("当前项目")).not.toBeInTheDocument();
    expect(screen.queryByText("ACP Agent")).not.toBeInTheDocument();
    expect(screen.queryByText("任务说明模板")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("命令")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("参数")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "复制 Board 链接" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "启用 Agent 集成" }));

    expect(onAgentAccessToggle).toHaveBeenCalledWith(true);
  });
});
