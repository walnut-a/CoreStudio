import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setActiveDesktopLocale } from "../copy";
import { EditorLoadingOverlay } from "./EditorLoadingOverlay";

describe("EditorLoadingOverlay", () => {
  afterEach(() => setActiveDesktopLocale("zh-CN"));

  it("keeps the progress treatment for normal board initialization", () => {
    const { container } = render(<EditorLoadingOverlay />);

    expect(
      screen.getByRole("status", { name: "正在加载画板…" }),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".image-board-canvas__loading-spinner"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "刷新页面" }),
    ).not.toBeInTheDocument();
  });

  it("stops showing progress and offers a browser refresh after the room closes", () => {
    const onReload = vi.fn();
    const { container } = render(
      <EditorLoadingOverlay mode="refresh-required" onReload={onReload} />,
    );

    expect(
      screen.getByRole("alert", { name: "画板连接已断开" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "当前页面闲置时间较长，或 CoreStudio 已重新启动。刷新页面即可恢复连接。",
      ),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".image-board-canvas__loading-spinner"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新页面" }));

    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
