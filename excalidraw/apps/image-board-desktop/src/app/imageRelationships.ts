import type { ImageRecord, ImageRecordMap } from "../shared/projectTypes";

export interface ImageLineageEntry {
  record: ImageRecord;
  depth: number;
}

const toTimestamp = (createdAt: string) => {
  const value = Date.parse(createdAt);
  return Number.isNaN(value) ? 0 : value;
};

const sortByCreatedAt = (left: ImageRecord, right: ImageRecord) => {
  const delta = toTimestamp(left.createdAt) - toTimestamp(right.createdAt);
  if (delta !== 0) {
    return delta;
  }

  return left.fileId.localeCompare(right.fileId);
};

export const getImageAncestors = (
  imageRecords: ImageRecordMap | null | undefined,
  record: ImageRecord | null,
) => {
  if (!imageRecords || !record?.parentFileId) {
    return [] as ImageRecord[];
  }

  const ancestors: ImageRecord[] = [];
  const visited = new Set([record.fileId]);
  let parentFileId: string | null = record.parentFileId;

  while (parentFileId && !visited.has(parentFileId)) {
    visited.add(parentFileId);
    const parentRecord: ImageRecord | undefined = imageRecords[parentFileId];
    if (!parentRecord) {
      break;
    }

    ancestors.unshift(parentRecord);
    parentFileId = parentRecord.parentFileId ?? null;
  }

  return ancestors;
};

export const getImageDescendants = (
  imageRecords: ImageRecordMap | null | undefined,
  record: ImageRecord | null,
) => {
  if (!imageRecords || !record) {
    return [] as ImageLineageEntry[];
  }

  const descendants: ImageLineageEntry[] = [];
  const visited = new Set([record.fileId]);

  const visitChildren = (parentFileId: string, depth: number) => {
    const childRecords = Object.values(imageRecords)
      .filter(
        (candidate) =>
          candidate.parentFileId === parentFileId &&
          !visited.has(candidate.fileId),
      )
      .sort(sortByCreatedAt);

    for (const childRecord of childRecords) {
      visited.add(childRecord.fileId);
      descendants.push({
        record: childRecord,
        depth,
      });
      visitChildren(childRecord.fileId, depth + 1);
    }
  };

  visitChildren(record.fileId, 0);
  return descendants;
};
