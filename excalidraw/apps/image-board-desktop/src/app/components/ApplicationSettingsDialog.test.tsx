import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setActiveDesktopLocale } from "../copy";

import {
  ApplicationSettingsDialog,
  useApplicationSettingsLeave,
} from "./ApplicationSettingsDialog";

const DetailBackProbe = ({ onBack }: { onBack: () => void }) => {
  const requestLeave = useApplicationSettingsLeave();
  return <button onClick={() => requestLeave(onBack)}>返回上一级</button>;
};

describe("ApplicationSettingsDialog", () => {
  const renderDialog = ({ dirty = false, updateAvailable = false } = {}) => {
    const onCategoryChange = vi.fn();
    const onClose = vi.fn();

    render(
      <ApplicationSettingsDialog
        open
        activeCategory="image-generation"
        dirty={dirty}
        updateAvailable={updateAvailable}
        onCategoryChange={onCategoryChange}
        onDiscardChanges={vi.fn()}
        onClose={onClose}
        generalContent={<div>通用内容</div>}
        imageGenerationContent={<div>图像生成内容</div>}
        codexIntegrationContent={<div>Codex 集成内容</div>}
        aboutContent={<div>关于内容</div>}
      />,
    );

    return { onCategoryChange, onClose };
  };

  it("显示四个一级分类和当前分类内容", () => {
    renderDialog();

    expect(screen.getByRole("tab", { name: "通用" })).toBeInTheDocument();
    const activeTab = screen.getByRole("tab", { name: "图片集成" });
    expect(activeTab).toHaveAttribute("aria-selected", "true");
    expect(activeTab).toHaveAttribute(
      "aria-controls",
      "app-settings-panel-image-generation",
    );
    expect(screen.getByRole("tabpanel", { name: "图片集成" })).toHaveAttribute(
      "id",
      "app-settings-panel-image-generation",
    );
    expect(screen.getByRole("tab", { name: "Agent 集成" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "关于" })).toBeInTheDocument();
    expect(screen.getByText("图像生成内容")).toBeInTheDocument();
  });

  it("使用方向键切换设置分类并保持单一 Tab 停靠点", () => {
    const { onCategoryChange } = renderDialog();
    const activeTab = screen.getByRole("tab", { name: "图片集成" });
    const generalTab = screen.getByRole("tab", { name: "通用" });
    const codexTab = screen.getByRole("tab", { name: "Agent 集成" });

    expect(activeTab).toHaveAttribute("tabindex", "0");
    expect(generalTab).toHaveAttribute("tabindex", "-1");
    expect(codexTab).toHaveAttribute("tabindex", "-1");

    activeTab.focus();
    fireEvent.keyDown(activeTab, { key: "ArrowRight" });

    expect(onCategoryChange).toHaveBeenCalledWith("codex-integration");
    expect(codexTab).toHaveFocus();
  });

  it("切换到关于分类", () => {
    const { onCategoryChange } = renderDialog();

    fireEvent.click(screen.getByRole("tab", { name: "关于" }));

    expect(onCategoryChange).toHaveBeenCalledWith("about");
  });

  it("在关于分类显示未查看更新提示", () => {
    renderDialog({ updateAvailable: true });

    expect(
      screen.getByRole("tab", { name: "关于，有可用更新" }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("application-settings-update-indicator"),
    ).toBeInTheDocument();
  });

  it("没有未保存修改时直接切换分类", () => {
    const { onCategoryChange } = renderDialog();

    fireEvent.click(screen.getByRole("tab", { name: "Agent 集成" }));

    expect(onCategoryChange).toHaveBeenCalledWith("codex-integration");
  });

  it("存在未保存修改时先确认切换", () => {
    const { onCategoryChange } = renderDialog({ dirty: true });

    fireEvent.click(screen.getByRole("tab", { name: "Agent 集成" }));

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
        generalContent={null}
        imageGenerationContent={<DetailBackProbe onBack={onBack} />}
        codexIntegrationContent={null}
        aboutContent={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "返回上一级" }));
    expect(onBack).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "放弃修改" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("从同一个英文词典渲染设置框架", () => {
    setActiveDesktopLocale("en");
    renderDialog();

    expect(
      screen.getByRole("dialog", { name: "Application Settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "General" })).toBeInTheDocument();
  });
});

afterEach(() => {
  setActiveDesktopLocale("zh-CN");
});
