import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AboutSettingsSection } from "./AboutSettingsSection";

const availableUpdate = {
  status: "update-available" as const,
  update: {
    version: "9.9.0",
    publishedAt: "2026-09-01T00:00:00.000Z",
    minimumSystemVersion: "14.0",
    downloadPageURL: "https://getcorestudio.com/",
    releaseNotesURL:
      "https://github.com/walnut-a/CoreStudio/releases/tag/v9.9.0",
    summary: {
      "zh-CN": ["增加版本提醒", "改进稳定性"],
      en: ["Added update notifications"],
    },
  },
  availability: {
    currentVersion: "9.8.7",
    latestVersion: "9.9.0",
    hasUnreviewedUpdate: false,
    lastSuccessfulCheckAt: "2026-09-01T00:00:00.000Z",
  },
};

describe("AboutSettingsSection", () => {
  it("显示应用版本、仓库地址和开源依赖版本", () => {
    render(
      <AboutSettingsSection
        appInfo={{ name: "CoreStudio", version: "9.8.7" }}
        repositoryUrl="https://github.com/walnut-a/CoreStudio"
        dependencies={[
          {
            name: "Excalidraw",
            version: "0.18.0 · baseline 5ca08343",
          },
          { name: "React", version: "19.0.0" },
        ]}
        onOpenExternal={vi.fn()}
      />,
    );

    expect(screen.getByText("9.8.7")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "https://github.com/walnut-a/CoreStudio",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Excalidraw")).toBeInTheDocument();
    expect(screen.getByText("0.18.0 · baseline 5ca08343")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("19.0.0")).toBeInTheDocument();
  });

  it("通过宿主打开仓库地址", () => {
    const onOpenExternal = vi.fn();

    render(
      <AboutSettingsSection
        appInfo={null}
        repositoryUrl="https://github.com/walnut-a/CoreStudio"
        dependencies={[]}
        onOpenExternal={onOpenExternal}
      />,
    );

    screen
      .getByRole("button", {
        name: "https://github.com/walnut-a/CoreStudio",
      })
      .click();

    expect(onOpenExternal).toHaveBeenCalledWith(
      "https://github.com/walnut-a/CoreStudio",
    );
    expect(screen.getByText("未知")).toBeInTheDocument();
  });

  it("以内联结果展示可用更新并打开下载与说明页面", () => {
    const onCheckForUpdates = vi.fn();
    const onOpenExternal = vi.fn();
    render(
      <AboutSettingsSection
        appInfo={{ name: "CoreStudio", version: "9.8.7" }}
        repositoryUrl="https://github.com/walnut-a/CoreStudio"
        dependencies={[]}
        updateAvailability={{
          currentVersion: "9.8.7",
          latestVersion: "9.9.0",
          hasUnreviewedUpdate: true,
          lastSuccessfulCheckAt: null,
        }}
        manualUpdateState={{ status: "complete", result: availableUpdate }}
        onCheckForUpdates={onCheckForUpdates}
        onOpenExternal={onOpenExternal}
      />,
    );

    const checkButton = screen.getByRole("button", {
      name: "检查更新，有可用更新",
    });
    checkButton.click();
    expect(onCheckForUpdates).toHaveBeenCalledTimes(1);
    expect(screen.getByText("CoreStudio 9.9.0 可以更新")).toBeInTheDocument();
    expect(screen.getByText("增加版本提醒")).toBeInTheDocument();

    screen.getByRole("button", { name: "前往下载" }).click();
    screen.getByRole("button", { name: "查看更新说明" }).click();
    expect(onOpenExternal).toHaveBeenNthCalledWith(
      1,
      "https://getcorestudio.com/",
    );
    expect(onOpenExternal).toHaveBeenNthCalledWith(
      2,
      "https://github.com/walnut-a/CoreStudio/releases/tag/v9.9.0",
    );
  });

  it("检查期间禁用按钮，并为失败和最新状态提供内联反馈", () => {
    const { rerender } = render(
      <AboutSettingsSection
        appInfo={{ name: "CoreStudio", version: "9.8.7" }}
        repositoryUrl="https://github.com/walnut-a/CoreStudio"
        dependencies={[]}
        manualUpdateState={{ status: "checking" }}
        onCheckForUpdates={vi.fn()}
        onOpenExternal={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "正在检查…" })).toBeDisabled();
    rerender(
      <AboutSettingsSection
        appInfo={{ name: "CoreStudio", version: "9.8.7" }}
        repositoryUrl="https://github.com/walnut-a/CoreStudio"
        dependencies={[]}
        manualUpdateState={{ status: "failure" }}
        onCheckForUpdates={vi.fn()}
        onOpenExternal={vi.fn()}
      />,
    );
    expect(screen.getByText("暂时无法检查更新")).toBeInTheDocument();

    rerender(
      <AboutSettingsSection
        appInfo={{ name: "CoreStudio", version: "9.8.7" }}
        repositoryUrl="https://github.com/walnut-a/CoreStudio"
        dependencies={[]}
        manualUpdateState={{
          status: "complete",
          result: { ...availableUpdate, status: "up-to-date" },
        }}
        onCheckForUpdates={vi.fn()}
        onOpenExternal={vi.fn()}
      />,
    );
    expect(screen.getByText("当前已是最新版本")).toBeInTheDocument();
  });
});
