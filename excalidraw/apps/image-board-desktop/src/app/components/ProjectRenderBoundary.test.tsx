import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProjectRenderBoundary } from "./ProjectRenderBoundary";

const BrokenChild = ({ message }: { message: string }) => {
  throw new Error(message);
};

describe("ProjectRenderBoundary", () => {
  it("renders a project load error and reset action when a child crashes", () => {
    const onError = vi.fn();
    const onReset = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(
      <ProjectRenderBoundary
        projectKey="/tmp/corestudio-project"
        onError={onError}
        onReset={onReset}
      >
        <BrokenChild message="旧项目场景渲染失败" />
      </ProjectRenderBoundary>,
    );

    expect(
      screen.getByRole("heading", { name: "项目界面加载失败" }),
    ).toBeInTheDocument();
    expect(screen.getByText("旧项目场景渲染失败")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "返回项目列表" }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);

    consoleError.mockRestore();
  });

  it("clears the captured error when the project key changes", async () => {
    const onError = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const { rerender } = render(
      <ProjectRenderBoundary
        projectKey="/tmp/project-a"
        onError={onError}
        onReset={vi.fn()}
      >
        <BrokenChild message="项目 A 渲染失败" />
      </ProjectRenderBoundary>,
    );

    expect(
      screen.getByRole("heading", { name: "项目界面加载失败" }),
    ).toBeInTheDocument();

    rerender(
      <ProjectRenderBoundary
        projectKey="/tmp/project-b"
        onError={onError}
        onReset={vi.fn()}
      >
        <div>项目 B 已打开</div>
      </ProjectRenderBoundary>,
    );

    await waitFor(() => {
      expect(screen.getByText("项目 B 已打开")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("heading", { name: "项目界面加载失败" }),
    ).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});
