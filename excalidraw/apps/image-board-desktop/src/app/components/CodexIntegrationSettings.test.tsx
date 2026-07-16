import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
  integrationVersion: "1.1.0",
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
          installedIntegrationVersion: "1.1.0",
        },
      ],
    };

    render(
      <CodexIntegrationSettings
        open
        inspect={vi.fn(async () => readyStatus)}
        install={vi.fn(async () => ({
          ok: true as const,
          output: "",
          warning: null,
        }))}
        copyText={vi.fn(async () => true)}
      />,
    );

    expect(await screen.findByText("Integration compatibility")).toBeVisible();
    expect(
      screen.getByText("Executable: /Users/tester/.local/bin/corestudio"),
    ).toBeVisible();
    expect(
      screen.getByText("Codex can discover the CoreStudio usage guide."),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Integration 1.1.0; local CoreStudio session discovery is available.",
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
        install={vi.fn(async () => ({
          ok: true as const,
          output: "",
          warning: null,
        }))}
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

  it("直接安装后重新检测，并保留复制给 Codex 的修复兜底", async () => {
    const copyText = vi.fn(async () => true);
    const inspect = vi.fn(async () => status);
    const install = vi.fn(async () => ({
      ok: true as const,
      output: "CoreStudio Codex 集成已准备好。",
      warning: null,
    }));
    render(
      <CodexIntegrationSettings
        open
        inspect={inspect}
        install={install}
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
    const installButton = screen.getByRole("button", {
      name: "安装 Codex 集成",
    });
    const copyRepairButton = screen.getByRole("button", {
      name: "复制给 Codex",
    });
    const copyUsageButton = screen.getByRole("button", {
      name: "复制使用指令",
    });
    expect(installButton).toHaveClass("image-board-button--small");
    expect(copyRepairButton).toHaveClass("image-board-button--small");
    expect(copyUsageButton).toHaveClass("image-board-button--small");
    fireEvent.click(installButton);
    await waitFor(() => expect(install).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(inspect).toHaveBeenCalledTimes(2));
    fireEvent.click(copyRepairButton);
    fireEvent.click(copyUsageButton);

    expect(copyText).toHaveBeenNthCalledWith(1, CODEX_INSTALL_PROMPT(status));
    expect(copyText).toHaveBeenNthCalledWith(2, "打开当前 CoreStudio 项目");
    await waitFor(() => expect(screen.getByText("已复制")).toBeInTheDocument());
  });

  it("窗口重新获得焦点时自动重新检测", async () => {
    const inspect = vi.fn(async () => status);
    render(
      <CodexIntegrationSettings
        open
        inspect={inspect}
        install={vi.fn(async () => ({
          ok: true as const,
          output: "",
          warning: null,
        }))}
        copyText={vi.fn(async () => true)}
      />,
    );

    await screen.findByText("CoreStudio CLI");
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => expect(inspect).toHaveBeenCalledTimes(2));
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
        install={vi.fn(async () => ({
          ok: true as const,
          output: "",
          warning: null,
        }))}
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
