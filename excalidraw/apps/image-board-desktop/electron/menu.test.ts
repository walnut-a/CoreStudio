import { describe, expect, it, vi } from "vitest";
import type { MenuItemConstructorOptions } from "electron";

import { createAppMenuTemplate } from "./menu";

const getSubmenuLabels = (submenu: MenuItemConstructorOptions["submenu"]) =>
  ((submenu || []) as MenuItemConstructorOptions[]).map((item) => item.label);

describe("createAppMenuTemplate", () => {
  it("uses Chinese labels for the desktop application menu", () => {
    const template = createAppMenuTemplate(vi.fn(), [
      {
        projectPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
        name: "常用项目",
        lastOpenedAt: "2026-04-16T08:00:00.000Z",
      },
    ]);

    expect(template.map((item) => item.label)).toEqual([
      "文件",
      "编辑",
    ]);

    expect(
      getSubmenuLabels(template[0].submenu),
    ).toContain("新建项目");
    expect(
      getSubmenuLabels(template[0].submenu),
    ).toContain("最近项目");
    expect(
      template.map((item) => item.label),
    ).not.toContain("生成");
  });
});
