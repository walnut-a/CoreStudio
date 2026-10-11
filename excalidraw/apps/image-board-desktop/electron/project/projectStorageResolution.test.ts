import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  createProjectStructure,
  readProjectBundle,
  writeProjectScene,
} from "../projectFs";
import { createProjectRoomService } from "../room/projectRoomService";
import {
  commitStorageResolution,
  previewStorageResolution,
} from "./projectStorageResolution";
const roots: string[] = [];
const services: ReturnType<typeof createProjectRoomService>[] = [];
afterEach(async () => {
  for (const service of services.splice(0))
    for (const room of service.manager.list())
      await service.closeProject(room.identity.projectId, { force: true });
  await Promise.all(
    roots.splice(0).map((p) => fs.rm(p, { recursive: true, force: true })),
  );
});
const setup = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "storage-resolution-"));
  roots.push(root);
  const { projectPath } = await createProjectStructure(root, "Test");
  const service = createProjectRoomService({
    readProjectBundle,
    writeProjectScene,
    persistenceDebounceMs: 60000,
  });
  services.push(service);
  const room = await service.openProject(projectPath);
  const apply = (x: number) =>
    room.applyMaintenanceOperation({
      ...room.identity,
      operationId: String(Math.random()),
      baseSequence: room.sequence,
      elements: [
        {
          id: "a",
          type: "rectangle",
          x,
          y: 0,
          width: 100,
          height: 100,
          angle: 0,
          version: room.sequence + 1,
          versionNonce: room.sequence + 1,
          isDeleted: false,
        },
      ],
    });
  apply(0);
  await room.flushPersistence();
  apply(80);
  const file = path.join(projectPath, "project.json");
  const doc = JSON.parse(await fs.readFile(file, "utf8"));
  doc.layout.elements.a.x = 450;
  await fs.writeFile(file, JSON.stringify(doc, null, 2));
  return { room, projectPath, file, apply };
};
it.each(["current", "external"] as const)(
  "resolves %s only after preview and backs up both disk and unsaved canvas",
  async (choice) => {
    const { room, projectPath } = await setup();
    const preview = await previewStorageResolution(room);
    expect(preview.changes).toHaveLength(1);
    const backup = await commitStorageResolution(room, preview, choice);
    const x = choice === "current" ? 80 : 450;
    expect(room.getSnapshot().scene.elements[0].x).toBe(x);
    expect(
      JSON.parse((await readProjectBundle(projectPath)).sceneJson).elements[0]
        .x,
    ).toBe(x);
    expect(
      JSON.parse(
        await fs.readFile(path.join(backup, "scene-current.json"), "utf8"),
      ).elements[0].x,
    ).toBe(80);
    expect(room.lifecycle).toBe("active");
  },
);
it("rejects a stale preview without losing later disk or canvas edits", async () => {
  const { room, file, apply } = await setup();
  let preview = await previewStorageResolution(room);
  apply(90);
  await expect(
    commitStorageResolution(room, preview, "external"),
  ).rejects.toThrow(/变化/);
  preview = await previewStorageResolution(room);
  await fs.writeFile(file, "{external editing");
  await expect(
    commitStorageResolution(room, preview, "current"),
  ).rejects.toThrow(/变化/);
  expect(await fs.readFile(file, "utf8")).toBe("{external editing");
  expect(room.getSnapshot().scene.elements[0].x).toBe(90);
});
