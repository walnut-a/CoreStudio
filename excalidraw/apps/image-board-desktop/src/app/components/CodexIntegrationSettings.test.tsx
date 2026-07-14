import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CodexIntegrationStatus } from "../../shared/desktopBridgeTypes";
import {
  CODEX_INSTALL_PROMPT,
  CodexIntegrationSettings,
} from "./CodexIntegrationSettings";

const status: CodexIntegrationStatus = {
  state: "install",
  command: "/bin/bash '/Applications/CoreStudio.app/install.sh'",
  detectedAt: "2026-07-14T00:00:00.000Z",
  checks: [
    { id: "cli", label: "CoreStudio CLI", status: "missing", detail: "未找到" },
    { id: "skill", label: "CoreStudio Skill", status: "ready", detail: "已安装" },
    {
      id: "compatibility",
      label: "版本与会话发现",
      status: "outdated",
      detail: "需要更新",
    },
  ],
};

describe("CodexIntegrationSettings", () => {
  it("打开时检测并直接列出三项结果", async () => {
    const inspect = vi.fn(async () => status);
    render(
      <CodexIntegrationSettings
        open
        inspect={inspect}
        copyText={vi.fn(async () => true)}
      />,
    );

    expect(screen.getByText("正在检测 Codex 集成...")).toBeInTheDocument();
    expect(await screen.findByText("CoreStudio CLI")).toBeInTheDocument();
    expect(screen.getByText("CoreStudio Skill")).toBeInTheDocument();
    expect(screen.getByText("版本与会话发现")).toBeInTheDocument();
    expect(inspect).toHaveBeenCalledTimes(1);
  });

  it("复制自然语言安装请求和固定的 Codex 使用指令", async () => {
    const copyText = vi.fn(async () => true);
    render(
      <CodexIntegrationSettings
        open
        inspect={vi.fn(async () => status)}
        copyText={copyText}
      />,
    );

    await screen.findByText("CoreStudio CLI");
    expect(screen.queryByText(status.command)).not.toBeInTheDocument();
    expect(screen.getByText(CODEX_INSTALL_PROMPT)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "复制给 Codex" }));
    fireEvent.click(screen.getByRole("button", { name: "复制使用指令" }));

    expect(copyText).toHaveBeenNthCalledWith(1, CODEX_INSTALL_PROMPT);
    expect(copyText).toHaveBeenNthCalledWith(2, "打开当前 CoreStudio 项目");
    await waitFor(() => expect(screen.getByText("已复制")).toBeInTheDocument());
  });

  it("检测失败时不伪造已准备好，并允许重新检测", async () => {
    const inspect = vi
      .fn<() => Promise<CodexIntegrationStatus>>()
      .mockRejectedValueOnce(new Error("IPC unavailable"))
      .mockResolvedValueOnce(status);
    render(
      <CodexIntegrationSettings
        open
        inspect={inspect}
        copyText={vi.fn(async () => true)}
      />,
    );

    expect(await screen.findByText("无法完成检测")).toBeInTheDocument();
    expect(screen.queryByText("环境已准备好")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新检测" }));
    await waitFor(() => expect(inspect).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("CoreStudio CLI")).toBeInTheDocument();
  });
});
