import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TopBar } from "./TopBar";

describe("TopBar", () => {
  const baseProps = {
    projectName: "测试项目",
    onOpenProject: vi.fn(),
    onImportImages: vi.fn(),
    onRevealProject: vi.fn(),
  };

  it("shows project actions without Agent controls", () => {
    render(<TopBar {...baseProps} />);

    expect(screen.getByText("测试项目")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "打开项目" }));
    fireEvent.click(screen.getByRole("button", { name: "导入图片" }));
    fireEvent.click(screen.getByRole("button", { name: "显示文件夹" }));

    expect(baseProps.onOpenProject).toHaveBeenCalledTimes(1);
    expect(baseProps.onImportImages).toHaveBeenCalledTimes(1);
    expect(baseProps.onRevealProject).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "复制 Agent Board 链接" }),
    ).not.toBeInTheDocument();
  });
});
