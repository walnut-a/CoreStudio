import { describe, expect, it, vi } from "vitest";
import { runIntegrationSetup } from "./agentIntegrationSetup";
describe("无界面接入安装", () => {
  const context = {
    homeDir: "/tmp/isolated-home",
    resourcesPath: "/tmp/CoreStudio.app/Contents/Resources",
    appVersion: "1.1.50",
  };
  it("不依赖 Bridge 或窗口，逐个安装明确指定的宿主", async () => {
    const install = vi.fn().mockResolvedValue({ ok: true });
    const result = await runIntegrationSetup(
      ["workbuddy", "qwenwork"],
      context,
      install,
    );
    expect(result.ok).toBe(true);
    expect(install.mock.calls.map(([args]) => args.host)).toEqual([
      "workbuddy",
      "qwenwork",
    ]);
    expect(install.mock.calls[0][0].settingsDirectory).toContain(
      "/tmp/isolated-home/Library/Application Support/",
    );
  });
  it("执行前验证所有宿主，不猜测或默认安装", async () => {
    const install = vi.fn();
    expect((await runIntegrationSetup([], context, install)).ok).toBe(false);
    expect(
      (await runIntegrationSetup(["workbuddy", "unknown"], context, install))
        .ok,
    ).toBe(false);
    expect(install).not.toHaveBeenCalled();
  });
  it("安装冲突时保留结果并停止，不绕过覆盖保护", async () => {
    const install = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "Skill 已修改" });
    const result = await runIntegrationSetup(
      ["workbuddy", "qwenwork"],
      context,
      install,
    );
    expect(result.ok).toBe(false);
    expect(install).toHaveBeenCalledTimes(1);
    const first = result.results[0];
    expect(first.ok).toBe(false);
    if (!first.ok) expect(first.error).toBe("Skill 已修改");
  });
});
