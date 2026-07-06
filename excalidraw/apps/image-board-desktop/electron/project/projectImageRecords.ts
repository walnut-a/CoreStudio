import path from "path";

import {
  PROJECT_FILENAMES,
  type ImageRecordMap,
} from "../../src/shared/projectTypes";

export interface ProjectImageRecordStorage {
  readText: (filePath: string) => Promise<string>;
  writeJson: (filePath: string, value: unknown) => Promise<void>;
}

export const getProjectImageRecordsPath = (projectPath: string) =>
  path.join(projectPath, PROJECT_FILENAMES.imageRecords);

export const readProjectImageRecords = async (
  projectPath: string,
  storage: Pick<ProjectImageRecordStorage, "readText">,
) =>
  JSON.parse(
    await storage.readText(getProjectImageRecordsPath(projectPath)),
  ) as ImageRecordMap;

export const writeProjectImageRecords = async (
  projectPath: string,
  imageRecords: ImageRecordMap,
  storage: Pick<ProjectImageRecordStorage, "writeJson">,
) => {
  await storage.writeJson(getProjectImageRecordsPath(projectPath), imageRecords);
};

export const repairLegacyGeneratedImageRecordOrigins = (
  imageRecords: ImageRecordMap,
) => {
  let nextImageRecords: ImageRecordMap | null = null;
  const repairedFileIds: string[] = [];

  for (const [fileId, record] of Object.entries(imageRecords)) {
    if (record.sourceType !== "generated" || record.generationOrigin) {
      continue;
    }

    nextImageRecords ??= { ...imageRecords };
    nextImageRecords[fileId] = {
      ...record,
      generationOrigin: "corestudio",
    };
    repairedFileIds.push(fileId);
  }

  return {
    imageRecords: nextImageRecords ?? imageRecords,
    repairedFileIds,
  };
};
