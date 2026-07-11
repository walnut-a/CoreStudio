import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgentConversationSidebar } from "./AgentConversationSidebar";

describe("AgentConversationSidebar", () => {
  it("keeps an empty Agent conversation focused on thread actions and composer", () => {
    render(
      <AgentConversationSidebar
        mode="agent"
        open={true}
        onOpenChange={vi.fn()}
        task={null}
        runLogDetail={null}
        threadEntries={[]}
        error={null}
        threadSummaries={[]}
        activeThreadId={null}
        canSubmitMessage={true}
        onSelectThread={vi.fn()}
        onStartNewThread={vi.fn()}
        onSubmitMessage={vi.fn()}
      />,
    );

    expect(screen.getByRole("region", { name: "Agent 对话" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开 Agent 对话列表" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始新的 Agent 对话" })).toBeInTheDocument();
    expect(screen.getByLabelText("Agent 对话为空")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入任务")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "发送给 Agent" }),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: "刷新记录" })).toBeNull();
    expect(screen.queryByRole("button", { name: "显示 JSON" })).toBeNull();
    expect(screen.queryByRole("button", { name: "查看保存日志" })).toBeNull();
    expect(screen.queryByRole("button", { name: "查看任务过程" })).toBeNull();
    expect(screen.queryByRole("switch", { name: "启用 Agent 集成" })).toBeNull();
    expect(screen.queryByText("任务说明模板")).toBeNull();
    expect(screen.queryByLabelText("命令")).toBeNull();
    expect(screen.queryByLabelText("参数")).toBeNull();
    expect(screen.queryByRole("button", { name: "复制 Board 链接" })).toBeNull();
  });
});
