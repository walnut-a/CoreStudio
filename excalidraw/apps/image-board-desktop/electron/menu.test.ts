import { describe, expect, it, vi } from "vitest";
import type { MenuItemConstructorOptions } from "electron";

import { createAppMenuTemplate } from "./menu";

const getSubmenuLabels = (submenu: MenuItemConstructorOptions["submenu"]) =>
  ((submenu || []) as MenuItemConstructorOptions[]).map((item) => item.label);

const getSubmenuItems = (submenu: MenuItemConstructorOptions["submenu"]) =>
  (submenu || []) as MenuItemConstructorOptions[];

describe("createAppMenuTemplate", () => {
  it("uses Chinese labels for the desktop application menu", () => {
    const template = createAppMenuTemplate(vi.fn(), [
      {
        projectPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
        name: "常用项目",
        lastOpenedAt: "2026-04-16T08:00:00.000Z",
      },
    ], "1.1.9");

    expect(template.map((item) => item.label)).toEqual([
      "文件",
      "编辑",
      "帮助",
    ]);

    expect(
      getSubmenuLabels(template[0].submenu),
    ).toContain("版本 1.1.9");
    expect(
      getSubmenuLabels(template[0].submenu),
    ).toContain("新建项目");
    expect(
      getSubmenuLabels(template[0].submenu),
    ).toContain("安全模式打开项目");
    expect(
      getSubmenuLabels(template[0].submenu),
    ).toContain("最近项目");
    expect(
      getSubmenuLabels(template[0].submenu),
    ).toContain("检查当前项目健康");
    expect(
      getSubmenuLabels(template[0].submenu),
    ).toContain("修复当前项目缩略图");
    expect(
      getSubmenuLabels(template[0].submenu),
    ).toContain("清理当前项目缓存");
    expect(
      getSubmenuLabels(template[0].submenu),
    ).toContain("退出 CoreStudio");
    expect(
      template.map((item) => item.label),
    ).not.toContain("生成");
  });

  it("opens the about page from the help menu", () => {
    const sendMenuAction = vi.fn();
    const template = createAppMenuTemplate(sendMenuAction);
    const helpMenu = template.find((item) => item.label === "帮助");
    const aboutItem = getSubmenuItems(helpMenu?.submenu).find(
      (item) => item.label === "关于 CoreStudio",
    );

    expect(aboutItem).toBeTruthy();

    aboutItem?.click?.(aboutItem as any, undefined, undefined as any);

    expect(sendMenuAction).toHaveBeenCalledWith(
      { action: "show-about" },
      undefined,
    );
  });

  it("sends a repair current project thumbnails action from the file menu", () => {
    const sendMenuAction = vi.fn();
    const template = createAppMenuTemplate(sendMenuAction);
    const fileMenu = template.find((item) => item.label === "文件");
    const repairItem = getSubmenuItems(fileMenu?.submenu).find(
      (item) => item.label === "修复当前项目缩略图",
    );

    expect(repairItem).toBeTruthy();

    repairItem?.click?.(repairItem as any, undefined, undefined as any);

    expect(sendMenuAction).toHaveBeenCalledWith(
      { action: "repair-project-thumbnails" },
      undefined,
    );
  });

  it("sends an inspect current project health action from the file menu", () => {
    const sendMenuAction = vi.fn();
    const template = createAppMenuTemplate(sendMenuAction);
    const fileMenu = template.find((item) => item.label === "文件");
    const inspectItem = getSubmenuItems(fileMenu?.submenu).find(
      (item) => item.label === "检查当前项目健康",
    );

    expect(inspectItem).toBeTruthy();

    inspectItem?.click?.(inspectItem as any, undefined, undefined as any);

    expect(sendMenuAction).toHaveBeenCalledWith(
      { action: "inspect-project-health" },
      undefined,
    );
  });

  it("sends safe open and cache cleanup actions from the file menu", () => {
    const sendMenuAction = vi.fn();
    const template = createAppMenuTemplate(sendMenuAction);
    const fileMenu = template.find((item) => item.label === "文件");
    const fileItems = getSubmenuItems(fileMenu?.submenu);
    const safeOpenItem = fileItems.find(
      (item) => item.label === "安全模式打开项目",
    );
    const cleanCacheItem = fileItems.find(
      (item) => item.label === "清理当前项目缓存",
    );

    safeOpenItem?.click?.(safeOpenItem as any, undefined, undefined as any);
    cleanCacheItem?.click?.(cleanCacheItem as any, undefined, undefined as any);

    expect(sendMenuAction).toHaveBeenCalledWith(
      { action: "open-project-safe" },
      undefined,
    );
    expect(sendMenuAction).toHaveBeenCalledWith(
      { action: "clean-project-cache" },
      undefined,
    );
  });
});
