import type { MessageBoxOptions } from "electron";
import type { ProjectRoom } from "../room/projectRoom";
import {
  previewStorageResolution,
  commitStorageResolution,
} from "./projectStorageResolution";
import {
  previewProjectReconstruction,
  commitProjectReconstruction,
} from "./projectReconstruction";
export type PresentRecoveryDialog = (
  options: MessageBoxOptions,
) => Promise<{ response: number }>;
export const resolveProjectStorageWithDialog = async (
  room: ProjectRoom,
  present: PresentRecoveryDialog,
) => {
  const preview = await previewStorageResolution(room);
  const detail = preview.external
    ? `共 ${
        preview.changes.length
      } 个元素存在差异。选择将应用到整个画布，不改变当前视口。\n\n${preview.changes
        .slice(0, 8)
        .map(
          (c) =>
            `${c.id}\n当前：${c.current}\n整理：${c.external}${
              preview.nativeDiffers ? `\n原生：${c.native}` : ""
            }`,
        )
        .join("\n\n")}${
        preview.changes.length > 8 ? "\n\n其余差异将一同处理。" : ""
      }\n\n处理前会备份磁盘文件及当前未保存画布。预览之后若又有修改，本次操作会停止。`
    : "项目文件已缺失或不可读取，当前窗口仍保留画布。可以根据当前画布和可核实的原图恢复保存。无法确定的项目设置及生成信息不会被编造；损坏原件会先备份。";
  const { response } = await present({
    type: "warning",
    title: "处理项目文件变化",
    message: preview.external
      ? "选择要保留的画布版本"
      : "保存当前画布以恢复项目",
    detail,
    buttons: preview.external
      ? preview.nativeDiffers
        ? ["取消", "保留当前画布", "采用整理文件", "采用原生画布"]
        : ["取消", "保留当前画布", "采用文件版本"]
      : ["取消", "保留当前画布"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });
  if (response === 0) return { resolved: false };
  if (
    response !== 1 &&
    !(response === 2 && preview.external) &&
    !(response === 3 && preview.nativeDiffers)
  )
    throw Error("无效的冲突处理选择。");
  const backupPath = await commitStorageResolution(
    room,
    preview,
    response === 1 ? "current" : response === 3 ? "native" : "external",
  );
  return { resolved: true, backupPath };
};
export const reconstructProjectWithDialog = async (input: {
  root: string;
  decode: Parameters<typeof previewProjectReconstruction>[1];
  present: PresentRecoveryDialog;
  acquire: () => Promise<{ release: () => Promise<void> }>;
}) => {
  const preview = await previewProjectReconstruction(input.root, input.decode);
  if (!preview?.records.length) return false;
  const { response } = await input.present({
    type: "warning",
    title: "从原图重建项目",
    message: `两份项目文件都不可用，发现 ${preview.records.length} 张可恢复图片`,
    detail: `可在原文件夹内重建可使用的图片项目，原图保持原位。\n\n将建立新的项目身份，按文件创建时间生成默认排布。旧坐标、文字、连线、主动删除意图和生成参数无法从原图还原；原有 Agent 连接需要重新绑定。\n\n${
      preview.issues.length
        ? `${
            preview.issues.length
          } 个文件无法读取，会保留并跳过：\n${preview.issues
            .slice(0, 6)
            .join("\n")}\n\n`
        : ""
    }损坏的项目文件会先备份。取消不会修改任何文件。`,
    buttons: ["取消", "从原图重建"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });
  if (response !== 1) throw Error("已取消重建，原文件未改动。");
  const lease = await input.acquire();
  try {
    await commitProjectReconstruction(preview);
  } finally {
    await lease.release();
  }
  return true;
};
