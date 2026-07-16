import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppErrorBanners } from "./AppErrorBanners";

describe("AppErrorBanners", () => {
  it("shows a product recovery action for stale project snapshots", () => {
    const onAction = vi.fn();

    render(
      <AppErrorBanners
        projectRecovery={{
          message:
            "项目内容已在其他会话中更新。自动保存已暂停，请加载最新版本后继续。",
          actionLabel: "加载最新版本",
          actionPendingLabel: "正在加载…",
          pending: false,
          onAction,
        }}
      />,
    );

    expect(
      screen.queryByText(/Error invoking remote method/),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "加载最新版本" }),
    );
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("disables the recovery action while the latest project is loading", () => {
    render(
      <AppErrorBanners
        projectRecovery={{
          message: "项目内容已更新。",
          actionLabel: "加载最新版本",
          actionPendingLabel: "正在加载…",
          pending: true,
          onAction: vi.fn(),
        }}
      />,
    );

    expect(
      screen.getByRole("button", { name: "正在加载…" }),
    ).toBeDisabled();
  });
});
