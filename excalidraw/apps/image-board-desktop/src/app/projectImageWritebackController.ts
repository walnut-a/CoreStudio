import type {
  DesktopBridgeApi,
  DesktopProjectBundle,
  PersistedImageAssetInput,
} from "../shared/desktopBridgeTypes";
import type {
  ImageRecordMap,
  ProjectImageWritebackTransaction,
} from "../shared/projectTypes";
import {
  applyPersistedProjectImageRecordsState,
  buildActiveProjectImageRecordsUpdate,
} from "./imageRecordState";

type WritebackState = "pending" | "committed" | "rolled-back";

type ProjectImageWritebackBridge = Pick<
  DesktopBridgeApi,
  "beginImageWriteback" | "commitImageWriteback" | "rollbackImageWriteback"
>;

export interface ProjectImageWritebackHandle {
  transaction: ProjectImageWritebackTransaction;
  imageRecords: ImageRecordMap;
  commit(): Promise<void>;
  rollback(): Promise<ImageRecordMap>;
}

export const beginProjectImageWritebackAction = async ({
  projectPath,
  projectImageRecords,
  getActiveProject,
  files,
  bridge,
  setActiveProject,
}: {
  projectPath: string;
  projectImageRecords: ImageRecordMap;
  getActiveProject: () => DesktopProjectBundle | null;
  files: PersistedImageAssetInput[];
  bridge: ProjectImageWritebackBridge;
  setActiveProject: (project: DesktopProjectBundle) => void;
}): Promise<ProjectImageWritebackHandle> => {
  const transaction = await bridge.beginImageWriteback({ projectPath, files });
  if (transaction.projectPath !== projectPath) {
    throw new Error("图片写回事务返回了不匹配的项目路径。");
  }

  const { imageRecords } = applyPersistedProjectImageRecordsState({
    projectPath,
    projectImageRecords,
    activeProject: getActiveProject(),
    persistedRecords: transaction.imageRecords,
    setActiveProject,
  });
  let state: WritebackState = "pending";
  let restoredRecords: ImageRecordMap | null = null;

  return {
    transaction,
    imageRecords,
    async commit() {
      if (state === "committed") {
        return;
      }
      if (state === "rolled-back") {
        throw new Error("已经回滚的图片写回事务不能提交。");
      }
      await bridge.commitImageWriteback({
        projectPath,
        transactionId: transaction.transactionId,
      });
      state = "committed";
    },
    async rollback() {
      if (state === "committed") {
        throw new Error("已经提交的图片写回事务不能回滚。");
      }
      if (state === "rolled-back" && restoredRecords) {
        return restoredRecords;
      }

      const nextRecords = await bridge.rollbackImageWriteback({
        projectPath,
        transactionId: transaction.transactionId,
      });
      const activeProjectUpdate = buildActiveProjectImageRecordsUpdate({
        projectPath,
        activeProject: getActiveProject(),
        nextImageRecords: nextRecords,
      });
      if (activeProjectUpdate) {
        setActiveProject(activeProjectUpdate);
      }
      restoredRecords = nextRecords;
      state = "rolled-back";
      return nextRecords;
    },
  };
};

export const rollbackProjectImageWritebackAfterFailure = async (
  writeback: ProjectImageWritebackHandle,
  originalError: unknown,
): Promise<never> => {
  try {
    await writeback.rollback();
  } catch (rollbackError) {
    const originalMessage =
      originalError instanceof Error
        ? originalError.message
        : String(originalError);
    const rollbackMessage =
      rollbackError instanceof Error
        ? rollbackError.message
        : String(rollbackError);
    throw Object.assign(
      new Error(
        `${originalMessage || "图片写回失败"}；事务回滚也失败：${
          rollbackMessage || "未知回滚错误"
        }`,
      ),
      {
        name: "ProjectImageWritebackRollbackError",
        cause: originalError,
        rollbackError,
      },
    );
  }
  throw originalError;
};
