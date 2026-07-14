import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ApplicationSettingsDialog,
  useApplicationSettingsLeave,
} from "./ApplicationSettingsDialog";

const DetailBackProbe = ({ onBack }: { onBack: () => void }) => {
  const requestLeave = useApplicationSettingsLeave();
  return <button onClick={() => requestLeave(onBack)}>返回上一级</button>;
};

describe("ApplicationSettingsDialog", () => {
  const renderDialog = ({ dirty = false } = {}) => {
    const onCategoryChange = vi.fn();
    const onClose = vi.fn();

    render(
      <ApplicationSettingsDialog
        open
        activeCategory="image-generation"
        dirty={dirty}
        onCategoryChange={onCategoryChange}
        onDiscardChanges={vi.fn()}
        onClose={onClose}
        imageGenerationContent={<div>图像生成内容</div>}
        codexIntegrationContent={<div>Codex 集成内容</div>}
        experimentalContent={<div>实验性功能内容</div>}
      />,
    );

    return { onCategoryChange, onClose };
  };

  it("显示三个一级分类和当前分类内容", () => {
    renderDialog();

    expect(screen.getByRole("tab", { name: "图像生成" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Codex 集成" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "实验性功能" })).toBeInTheDocument();
    expect(screen.getByText("图像生成内容")).toBeInTheDocument();
  });

  it("没有未保存修改时直接切换分类", () => {
    const { onCategoryChange } = renderDialog();

    fireEvent.click(screen.getByRole("tab", { name: "Codex 集成" }));

    expect(onCategoryChange).toHaveBeenCalledWith("codex-integration");
  });

  it("存在未保存修改时先确认切换", () => {
    const { onCategoryChange } = renderDialog({ dirty: true });

    fireEvent.click(screen.getByRole("tab", { name: "Codex 集成" }));

    expect(onCategoryChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", { name: "放弃未保存的修改？" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    expect(onCategoryChange).not.toHaveBeenCalled();
  });

  it("确认放弃后执行原来的关闭操作", () => {
    const { onClose } = renderDialog({ dirty: true });

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    fireEvent.click(screen.getByRole("button", { name: "放弃修改" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("内容页返回也复用未保存修改确认", () => {
    const onBack = vi.fn();
    render(
      <ApplicationSettingsDialog
        open
        activeCategory="image-generation"
        dirty
        onCategoryChange={vi.fn()}
        onDiscardChanges={vi.fn()}
        onClose={vi.fn()}
        imageGenerationContent={<DetailBackProbe onBack={onBack} />}
        codexIntegrationContent={null}
        experimentalContent={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "返回上一级" }));
    expect(onBack).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "放弃修改" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
