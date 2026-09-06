import { createHash } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ProjectAssetPayload } from "../../src/shared/desktopBridgeTypes";
import type {
  ProjectRoomScene,
  ProjectRoomSceneElement,
} from "../../src/shared/projectRoomProtocol";
import type { VisibleImageTransform } from "../project/visibleImageTransform";
import { getVisibleImageTransform } from "../project/visibleImageTransform";

export type AgentReferenceImage = ProjectAssetPayload & { elementId?: string };
export type ReadAgentReferenceImages = (input: {
  projectPath: string;
  fileIds: string[];
  elementIds: string[];
}) => Promise<AgentReferenceImage[]>;
const badRequest = (message: string) =>
  Object.assign(new Error(message), { code: "BAD_REQUEST" });

export const createAgentReferenceImages = ({
  getRoomScene,
  readProjectAssetPayloads,
  render,
}: {
  getRoomScene: (projectPath: string) => Promise<ProjectRoomScene>;
  readProjectAssetPayloads: (input: {
    projectPath: string;
    fileIds: string[];
    rendition: "original";
  }) => Promise<Array<ProjectAssetPayload | null>>;
  render: (
    asset: ProjectAssetPayload,
    transform: VisibleImageTransform,
  ) => Promise<{ width: number; height: number; dataBase64: string }>;
}) => {
  let directory: Promise<string> | undefined;
  let disposed = false;
  const pending = new Set<Promise<unknown>>();
  const writes = new Map<string, Promise<void>>();
  const read: ReadAgentReferenceImages = async ({
    projectPath,
    fileIds,
    elementIds,
  }) => {
    const scene = await getRoomScene(projectPath);
    const live = scene.elements.filter((e) => !e.isDeleted);
    let elements: ProjectRoomSceneElement[];
    if (elementIds.length) {
      elements = [...new Set(elementIds)]
        .map((id) => {
          const element = live.find((e) => e.id === id);
          if (!element) throw badRequest(`参考元素已失效：${id}`);
          if (
            element.type === "image" &&
            (typeof element.fileId !== "string" || !element.fileId.trim())
          ) {
            throw badRequest(`参考图片缺少资产标识：${id}`);
          }
          return element;
        })
        .filter((e) => e.type === "image" && typeof e.fileId === "string");
      const resolved = new Set(elements.map((e) => e.fileId));
      if (
        fileIds.some((id) => !resolved.has(id)) ||
        (fileIds.length &&
          elements.some((e) => !fileIds.includes(e.fileId as string)))
      ) {
        throw badRequest("参考图片与元素不匹配，请重新读取引用信息。");
      }
    } else {
      elements = [];
      for (const fileId of [...new Set(fileIds)]) {
        const matches = live.filter(
          (e) => e.type === "image" && e.fileId === fileId,
        );
        if (matches.length > 1)
          throw badRequest(
            `图片 ${fileId} 对应多个画布实例，请指定 reference-element-ids。`,
          );
        elements.push(
          matches[0] ?? {
            id: "",
            version: 0,
            versionNonce: 0,
            isDeleted: false,
            type: "image",
            fileId,
          },
        );
      }
    }
    const ids = [...new Set(elements.map((e) => e.fileId as string))];
    if (!ids.length) return [];
    const assets = await readProjectAssetPayloads({
      projectPath,
      fileIds: ids,
      rendition: "original",
    });
    const byId = new Map(
      assets.flatMap((asset) =>
        asset ? [[asset.fileId, asset] as const] : [],
      ),
    );
    const result: AgentReferenceImage[] = [];
    for (const element of elements) {
      const asset = byId.get(element.fileId as string);
      if (!asset) throw badRequest(`无法读取参考图片：${element.fileId}`);
      const transform = element.id ? getVisibleImageTransform(element) : null;
      const rendered = transform ? await render(asset, transform) : null;
      result.push({
        ...asset,
        ...(rendered ? { ...rendered, mimeType: "image/png" } : {}),
        ...(element.id ? { elementId: element.id } : {}),
      });
    }
    return result;
  };
  const paths = (input: Parameters<ReadAgentReferenceImages>[0]) => {
    const job = (async () => {
      if (disposed) throw new Error("参考图服务已关闭。");
      const assets = await read(input);
      if (disposed) throw new Error("参考图服务已关闭。");
      if (!assets.length) return [];
      directory ??= mkdtemp(
        path.join(tmpdir(), "corestudio-agent-references-"),
      );
      const root = await directory;
      return Promise.all(
        assets.map(async (asset) => {
          const bytes = Buffer.from(asset.dataBase64, "base64");
          const digest = createHash("sha256").update(bytes).digest("hex");
          const extension =
            (
              {
                "image/png": "png",
                "image/jpeg": "jpg",
                "image/webp": "webp",
                "image/svg+xml": "svg",
              } as Record<string, string>
            )[asset.mimeType] ?? "img";
          const output = path.join(root, `${digest}.${extension}`);
          // Wait for an in-flight write before exposing the path to another request.
          let write = writes.get(output);
          if (!write) {
            write = writeFile(output, bytes, { mode: 0o600 });
            writes.set(output, write);
            void write.catch(() => writes.delete(output));
          }
          await write;
          return {
            fileId: asset.fileId,
            elementId: asset.elementId,
            path: output,
            mimeType: asset.mimeType,
            width: asset.width,
            height: asset.height,
            rendition: "visible" as const,
          };
        }),
      );
    })();
    pending.add(job);
    void job.finally(() => pending.delete(job)).catch(() => undefined);
    return job;
  };
  const dispose = async () => {
    disposed = true;
    await Promise.allSettled([...pending]);
    if (directory) await rm(await directory, { recursive: true, force: true });
    writes.clear();
  };
  return { read, paths, dispose };
};
