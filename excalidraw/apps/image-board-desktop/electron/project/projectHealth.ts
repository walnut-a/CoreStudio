import { inspectProjectRecordIntegrity } from "../../src/shared/projectRecordIntegrity";
import type {
  ImageAssetRequestRendition,
  ImageRecord,
  ImageRecordMap,
  ProjectManifest,
} from "../../src/shared/projectTypes";
import type {
  ProjectHealthIssue,
  ProjectHealthReport,
} from "../../src/shared/desktopBridgeTypes";
import type { UnwrittenAcpOutput } from "../acp/acpOutputRecovery";

type CachedImageAssetRendition = Exclude<
  ImageAssetRequestRendition,
  "original"
>;

interface ProjectHealthBundle {
  project: ProjectManifest;
  sceneJson: string;
  imageRecords: ImageRecordMap;
}

interface SceneImageReference {
  fileId: string;
  elementId?: string;
}

interface InspectProjectHealthDependencies {
  readProjectBundle: (projectPath: string) => Promise<ProjectHealthBundle>;
  listProjectAssetPaths?: (projectPath: string) => Promise<string[]>;
  resolveProjectAssetPath: (projectPath: string, assetPath: string) => string;
  pathExists: (targetPath: string) => Promise<boolean>;
  cachedRenditionExists: (input: {
    projectPath: string;
    record: ImageRecord;
    rendition: CachedImageAssetRendition;
  }) => Promise<boolean>;
  collectUnwrittenAcpOutputs: (input: {
    projectToken: string;
    imageRecords: ImageRecordMap;
    agentRunsBaseDir?: string;
  }) => Promise<UnwrittenAcpOutput[]>;
}

const readSceneImageReferences = (sceneJson: string) => {
  try {
    const scene = JSON.parse(sceneJson) as {
      elements?: Array<{
        id?: unknown;
        type?: unknown;
        fileId?: unknown;
        isDeleted?: unknown;
      }>;
    };
    const references: SceneImageReference[] = [];
    for (const element of Array.isArray(scene.elements)
      ? scene.elements
      : []) {
      if (
        element?.type === "image" &&
        element.isDeleted !== true &&
        typeof element.fileId === "string" &&
        element.fileId
      ) {
        references.push({
          fileId: element.fileId,
          elementId:
            typeof element.id === "string" ? element.id : undefined,
        });
      }
    }
    return {
      parseFailed: false,
      references,
    };
  } catch {
    return {
      parseFailed: true,
      references: [] as SceneImageReference[],
    };
  }
};

const normalizeProjectAssetPath = (assetPath: string) =>
  assetPath.replace(/\\/g, "/").replace(/^\.\//, "");

const PROJECT_ASSET_FILE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "svg",
  "bin",
]);

const getProjectAssetFileIdFromPath = (assetPath: string) => {
  const fileName = normalizeProjectAssetPath(assetPath)
    .split("/")
    .filter(Boolean)
    .pop();
  if (!fileName) {
    return null;
  }
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return null;
  }
  const extension = fileName.slice(dotIndex + 1).toLowerCase();
  if (!PROJECT_ASSET_FILE_EXTENSIONS.has(extension)) {
    return null;
  }
  const stem = fileName.slice(0, dotIndex);
  const separatorIndex = stem.indexOf("_");
  return separatorIndex >= 0 && separatorIndex < stem.length - 1
    ? stem.slice(separatorIndex + 1)
    : stem;
};

export const inspectProjectHealth = async (
  {
    projectPath,
    agentRunsBaseDir,
  }: {
    projectPath: string;
    agentRunsBaseDir?: string;
  },
  deps: InspectProjectHealthDependencies,
): Promise<ProjectHealthReport> => {
  const bundle = await deps.readProjectBundle(projectPath);
  const sceneReferences = readSceneImageReferences(bundle.sceneJson);
  const sceneImageFileIds = Array.from(
    new Set(sceneReferences.references.map((reference) => reference.fileId)),
  );
  const imageRecordFileIds = Object.keys(bundle.imageRecords);
  const generatedImageRecordFileIds = imageRecordFileIds.filter(
    (fileId) => bundle.imageRecords[fileId]?.sourceType === "generated",
  );
  const issues: ProjectHealthIssue[] = [];

  if (sceneReferences.parseFailed) {
    issues.push({
      code: "scene-parse-failed",
      severity: "error",
      message: "画板数据无法解析。",
      repairable: false,
      resolution: {
        status: "manual",
        summary: "需要从备份或历史版本恢复画板文件。",
      },
    });
  }

  const addIssue = (issue: ProjectHealthIssue) => {
    issues.push(issue);
  };

  const missingImageRecordFileIds: string[] = [];
  for (const reference of sceneReferences.references) {
    if (bundle.imageRecords[reference.fileId]) {
      continue;
    }
    if (!missingImageRecordFileIds.includes(reference.fileId)) {
      missingImageRecordFileIds.push(reference.fileId);
    }
    addIssue({
      code: "missing-image-record",
      severity: "error",
      fileId: reference.fileId,
      elementId: reference.elementId,
      message: `画板图片缺少索引记录：${reference.fileId}`,
      repairable: false,
      resolution: {
        status: "manual",
        summary: "需要恢复图片索引记录，或重新导入这张画板图片。",
      },
    });
  }

  const recordedAssetPaths = new Set(
    Object.values(bundle.imageRecords).map((record) =>
      normalizeProjectAssetPath(record.assetPath),
    ),
  );
  const unindexedAssetFileIds: string[] = [];
  const assetPaths = deps.listProjectAssetPaths
    ? await deps.listProjectAssetPaths(projectPath)
    : [];
  for (const assetPath of assetPaths.map(normalizeProjectAssetPath)) {
    if (recordedAssetPaths.has(assetPath)) {
      continue;
    }
    const fileId = getProjectAssetFileIdFromPath(assetPath);
    if (!fileId || unindexedAssetFileIds.includes(fileId)) {
      continue;
    }
    unindexedAssetFileIds.push(fileId);
    addIssue({
      code: "missing-image-record",
      severity: "error",
      fileId,
      path: assetPath,
      message: `项目资产缺少索引记录：${assetPath}`,
      repairable: false,
      resolution: {
        status: "manual",
        summary: "需要恢复图片索引记录，或确认后重新导入这张项目资产。",
      },
    });
  }

  const missingAssetFileIds: string[] = [];
  const missingThumbnailFileIds: string[] = [];
  const missingPreviewFileIds: string[] = [];
  const unwrittenAcpOutputs = await deps.collectUnwrittenAcpOutputs({
    projectToken: bundle.project.agentAccess.token,
    imageRecords: bundle.imageRecords,
    agentRunsBaseDir,
  });

  await Promise.all(
    imageRecordFileIds.map(async (fileId) => {
      const record = bundle.imageRecords[fileId];
      let assetExists = false;
      try {
        assetExists = await deps.pathExists(
          deps.resolveProjectAssetPath(projectPath, record.assetPath),
        );
      } catch {
        assetExists = false;
      }

      if (!assetExists) {
        missingAssetFileIds.push(fileId);
        addIssue({
          code: "missing-asset-file",
          severity: "error",
          fileId,
          path: record.assetPath,
          message: `图片原始文件缺失：${record.assetPath}`,
          repairable: false,
          resolution: {
            status: "manual",
            summary: "需要从备份恢复原始图片文件，或清理对应图片记录。",
          },
        });
        return;
      }

      if (
        !(await deps.cachedRenditionExists({
          projectPath,
          record,
          rendition: "thumbnail",
        }))
      ) {
        missingThumbnailFileIds.push(fileId);
        addIssue({
          code: "missing-thumbnail-cache",
          severity: "warning",
          fileId,
          message: `图片缓存待重建：${fileId}`,
          repairable: true,
          resolution: {
            status: "repairable",
            summary: "项目数据修复会重新生成这张图片的显示缓存。",
          },
        });
      }

      if (
        !(await deps.cachedRenditionExists({
          projectPath,
          record,
          rendition: "preview",
        }))
      ) {
        missingPreviewFileIds.push(fileId);
        addIssue({
          code: "missing-preview-cache",
          severity: "info",
          fileId,
          message: `预览缓存尚未生成：${fileId}`,
          repairable: false,
          resolution: {
            status: "info",
            summary: "这是非阻断提示，通常无需手动处理。",
          },
        });
      }
    }),
  );

  const recordIntegrityReport = inspectProjectRecordIntegrity({
    imageRecords: bundle.imageRecords,
    sceneImageFileIds,
    missingAssetFileIds,
    unwrittenAcpOutputs,
  });
  recordIntegrityReport.issues.forEach(addIssue);

  return {
    checkedAt: new Date().toISOString(),
    projectPath,
    imageRecordCount: imageRecordFileIds.length,
    generatedImageRecordCount: generatedImageRecordFileIds.length,
    sceneImageFileCount: sceneImageFileIds.length,
    missingImageRecordFileIds,
    unindexedAssetFileIds,
    missingAssetFileIds,
    missingThumbnailFileIds,
    missingPreviewFileIds,
    orphanImageRecordFileIds:
      recordIntegrityReport.orphanImageRecordFileIds,
    orphanGeneratedImageRecordFileIds:
      recordIntegrityReport.orphanGeneratedImageRecordFileIds,
    unwrittenAcpOutputFileIds:
      recordIntegrityReport.unwrittenAcpOutputFileIds,
    incompleteGenerationRecordFileIds:
      recordIntegrityReport.incompleteGenerationRecordFileIds,
    brokenParentFileIds: recordIntegrityReport.brokenParentFileIds,
    brokenPromptReferenceFileIds:
      recordIntegrityReport.brokenPromptReferenceFileIds,
    recordExplanations: recordIntegrityReport.recordExplanations,
    issues,
    summary: {
      errorCount: issues.filter((issue) => issue.severity === "error").length,
      warningCount: issues.filter((issue) => issue.severity === "warning")
        .length,
      repairableCount: issues.filter((issue) => issue.repairable).length,
    },
  };
};
