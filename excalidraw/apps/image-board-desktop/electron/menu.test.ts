import { describe, expect, it, vi } from "vitest";
import type { MenuItemConstructorOptions } from "electron";

import { CORESTUDIO_RELEASES_URL, createAppMenuTemplate } from "./menu";

const getSubmenuLabels = (submenu: MenuItemConstructorOptions["submenu"]) =>
  ((submenu || []) as MenuItemConstructorOptions[]).map((item) => item.label);

const getSubmenuItems = (submenu: MenuItemConstructorOptions["submenu"]) =>
  (submenu || []) as MenuItemConstructorOptions[];

const getMenuItem = (
  submenu: MenuItemConstructorOptions["submenu"],
  label: string,
) => getSubmenuItems(submenu).find((item) => item.label === label);

const getProjectMaintenanceMenu = (template: MenuItemConstructorOptions[]) => {
  const fileMenu = template.find((item) => item.label === "文件");
  const maintenanceMenu = getMenuItem(fileMenu?.submenu, "项目维护");
  return getSubmenuItems(maintenanceMenu?.submenu);
};

const getAllMenuLabels = (items: MenuItemConstructorOptions[]): string[] =>
  items.flatMap((item) => [
    ...(typeof item.label === "string" ? [item.label] : []),
    ...getAllMenuLabels(getSubmenuItems(item.submenu)),
  ]);

describe("createAppMenuTemplate", () => {
  it("uses Chinese labels for the desktop application menu", () => {
    const template = createAppMenuTemplate(
      vi.fn(),
      [
        {
          projectPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
          name: "常用项目",
          lastOpenedAt: "2026-04-16T08:00:00.000Z",
        },
      ],
      "1.1.9",
      undefined,
      { platform: "linux" },
    );

    expect(template.map((item) => item.label)).toEqual([
      "文件",
      "编辑",
      "设置",
      "帮助",
    ]);

    expect(getSubmenuLabels(template[0].submenu)).toContain("版本 1.1.9");
    expect(getSubmenuLabels(template[0].submenu)).toContain("新建项目");
    expect(getSubmenuLabels(template[0].submenu)).toContain("最近项目");
    expect(getSubmenuLabels(template[0].submenu)).toContain("项目维护");
    expect(getSubmenuLabels(template[0].submenu)).not.toContain(
      "安全模式打开项目",
    );
    expect(getSubmenuLabels(template[0].submenu)).not.toContain(
      "检查当前项目健康",
    );
    expect(getSubmenuLabels(template[0].submenu)).toContain("退出 CoreStudio");
    expect(template.map((item) => item.label)).not.toContain("生成");
    expect(getAllMenuLabels(template)).not.toContain("复制 Agent Board 链接");
    expect(getAllMenuLabels(template)).not.toContain("最近 Agent 任务");
    expect(getAllMenuLabels(template)).not.toContain("默认生成方式");

    const maintenanceLabels = getProjectMaintenanceMenu(template).map(
      (item) => item.label,
    );
    expect(maintenanceLabels).toContain("安全模式打开项目");
    expect(maintenanceLabels).toContain("检查当前项目健康");
    expect(maintenanceLabels).toContain("修复当前项目数据");
    expect(maintenanceLabels).toContain("清理当前项目缓存");
  });

  it("builds the same application menu from the English catalog", () => {
    const template = createAppMenuTemplate(vi.fn(), [], "1.1.9", undefined, {
      platform: "linux",
      locale: "en",
    });

    expect(template.map((item) => item.label)).toEqual([
      "File",
      "Edit",
      "Settings",
      "Help",
    ]);
    expect(getSubmenuLabels(template[0].submenu)).toContain("New Project");
    expect(getSubmenuLabels(template[0].submenu)).toContain("Recent Projects");
    expect(getSubmenuLabels(template[0].submenu)).toContain("Quit CoreStudio");
  });

  it("opens application settings from the settings menu", () => {
    const sendMenuAction = vi.fn();
    const template = createAppMenuTemplate(
      sendMenuAction,
      [],
      undefined,
      undefined,
      {
        platform: "linux",
      },
    );
    const settingsMenu = template.find((item) => item.label === "设置");
    const settingsItem = getMenuItem(settingsMenu?.submenu, "应用设置");

    expect(settingsItem).toBeTruthy();

    settingsItem?.click?.(settingsItem as any, undefined, undefined as any);

    expect(sendMenuAction).toHaveBeenCalledWith(
      { action: "app-settings" },
      undefined,
    );
  });

  it("keeps Agent collaboration controls out of the application menu", () => {
    const template = createAppMenuTemplate(vi.fn(), [], "1.1.9", undefined, {
      platform: "linux",
    });

    expect(getAllMenuLabels(template)).not.toContain("启用 Agent 集成");
  });

  it("puts app-level settings inside the macOS application menu", () => {
    const sendMenuAction = vi.fn();
    const template = createAppMenuTemplate(
      sendMenuAction,
      [],
      "1.1.9",
      undefined,
      { platform: "darwin" },
    );

    expect(template.map((item) => item.label)).toEqual([
      "文件",
      "编辑",
      "帮助",
    ]);
    expect(getSubmenuLabels(template[0].submenu)).not.toContain(
      "启用 Agent 集成",
    );
    expect(getSubmenuLabels(template[0].submenu)).toContain("应用设置");
    expect(template.map((item) => item.label)).not.toContain("设置");

    const appSettingsItem = getMenuItem(template[0].submenu, "应用设置");

    appSettingsItem?.click?.(
      appSettingsItem as any,
      undefined,
      undefined as any,
    );
    expect(sendMenuAction).toHaveBeenCalledWith(
      { action: "app-settings" },
      undefined,
    );
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

  it("opens the GitHub releases page from the help menu", () => {
    const openExternal = vi.fn();
    const template = createAppMenuTemplate(vi.fn(), [], "1.1.9", openExternal);
    const helpMenu = template.find((item) => item.label === "帮助");
    const updateItem = getMenuItem(helpMenu?.submenu, "查看更新");

    expect(updateItem).toBeTruthy();

    updateItem?.click?.(updateItem as any, undefined, undefined as any);

    expect(openExternal).toHaveBeenCalledWith(CORESTUDIO_RELEASES_URL);
  });

  it("sends a repair current project data action from the maintenance menu", () => {
    const sendMenuAction = vi.fn();
    const template = createAppMenuTemplate(sendMenuAction);
    const repairItem = getMenuItem(
      getProjectMaintenanceMenu(template),
      "修复当前项目数据",
    );

    expect(repairItem).toBeTruthy();

    repairItem?.click?.(repairItem as any, undefined, undefined as any);

    expect(sendMenuAction).toHaveBeenCalledWith(
      { action: "repair-project-thumbnails" },
      undefined,
    );
  });

  it("sends an inspect current project health action from the maintenance menu", () => {
    const sendMenuAction = vi.fn();
    const template = createAppMenuTemplate(sendMenuAction);
    const inspectItem = getMenuItem(
      getProjectMaintenanceMenu(template),
      "检查当前项目健康",
    );

    expect(inspectItem).toBeTruthy();

    inspectItem?.click?.(inspectItem as any, undefined, undefined as any);

    expect(sendMenuAction).toHaveBeenCalledWith(
      { action: "inspect-project-health" },
      undefined,
    );
  });

  it("sends safe open and cache cleanup actions from the maintenance menu", () => {
    const sendMenuAction = vi.fn();
    const template = createAppMenuTemplate(sendMenuAction);
    const maintenanceItems = getProjectMaintenanceMenu(template);
    const safeOpenItem = maintenanceItems.find(
      (item) => item.label === "安全模式打开项目",
    );
    const cleanCacheItem = maintenanceItems.find(
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
