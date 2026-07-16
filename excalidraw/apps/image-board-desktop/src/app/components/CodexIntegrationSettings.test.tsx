import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CodexIntegrationStatus } from "../../shared/desktopBridgeTypes";
import { setActiveDesktopLocale } from "../copy";
import {
  CODEX_INSTALL_PROMPT,
  CodexIntegrationSettings,
} from "./CodexIntegrationSettings";

const status: CodexIntegrationStatus = {
  state: "install",
  command: "/bin/bash '/Applications/CoreStudio.app/install.sh'",
  appVersion: "1.1.17",
  integrationVersion: "1.0.1",
  guideUrl:
    "https://github.com/walnut-a/CoreStudio/blob/v1.1.17/docs/codex-integration.md",
  detectedAt: "2026-07-14T00:00:00.000Z",
  checks: [
    {
      id: "cli",
      status: "missing",
      executablePath: "/Users/tester/.local/bin/corestudio",
    },
    {
      id: "skill",
      status: "ready",
    },
    {
      id: "compatibility",
      status: "outdated",
      installedIntegrationVersion: "0.9.0",
    },
  ],
};

describe("CodexIntegrationSettings", () => {
  it("用当前界面语言展示环境检测名称和说明", async () => {
    setActiveDesktopLocale("en");
    const readyStatus: CodexIntegrationStatus = {
      ...status,
      state: "ready",
      checks: [
        {
          id: "cli",
          status: "ready",
          executablePath: "/Users/tester/.local/bin/corestudio",
        },
        {
          id: "skill",
          status: "ready",
        },
        {
          id: "compatibility",
          status: "ready",
          installedIntegrationVersion: "1.0.1",
        },
      ],
    };

    render(
      <CodexIntegrationSettings
        open
        inspect={vi.fn(async () => readyStatus)}
        copyText={vi.fn(async () => true)}
      />,
    );

    expect(
      await screen.findByText("Integration compatibility"),
    ).toBeVisible();
    expect(
      screen.getByText("Executable: /Users/tester/.local/bin/corestudio"),
    ).toBeVisible();
    expect(
      screen.getByText("Codex can discover the CoreStudio usage guide."),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Integration 1.0.1; local CoreStudio session discovery is available.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/版本|可执行：|可以发现/)).toBeNull();
  });

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
    expect(screen.getByText("集成兼容性")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新检测" })).toHaveClass(
      "image-board-button--small",
    );
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
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent === CODEX_INSTALL_PROMPT(status),
      ),
    ).toBeInTheDocument();
    const copyInstallButton = screen.getByRole("button", {
      name: "复制给 Codex",
    });
    const copyUsageButton = screen.getByRole("button", {
      name: "复制使用指令",
    });
    expect(copyInstallButton).toHaveClass("image-board-button--small");
    expect(copyUsageButton).toHaveClass("image-board-button--small");
    fireEvent.click(copyInstallButton);
    fireEvent.click(copyUsageButton);

    expect(copyText).toHaveBeenNthCalledWith(1, CODEX_INSTALL_PROMPT(status));
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

afterEach(() => {
  setActiveDesktopLocale("zh-CN");
});
