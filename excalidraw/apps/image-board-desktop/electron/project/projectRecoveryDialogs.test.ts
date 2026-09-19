import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { it, expect, vi } from "vitest";
import { reconstructProjectWithDialog } from "./projectRecoveryDialogs";
it("cancelling reconstruction does not acquire a writer lease or create files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "recovery-dialog-"));
  try {
    await fs.writeFile(path.join(root, "a.svg"), "<svg/>");
    const acquire = vi.fn();
    const present = vi.fn(async () => ({ response: 0 }));
    await expect(
      reconstructProjectWithDialog({
        root,
        decode: async () => ({ width: 10, height: 10 }),
        present,
        acquire,
      }),
    ).rejects.toThrow("已取消");
    expect(acquire).not.toHaveBeenCalled();
    expect(await fs.readdir(root)).toEqual(["a.svg"]);
    expect(present.mock.calls[0]).toBeDefined();
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
