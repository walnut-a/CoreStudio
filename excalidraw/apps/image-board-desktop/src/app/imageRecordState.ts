import type {
  ImageRecord,
  ImageRecordMap,
} from "../shared/projectTypes";

import {
  getImageAncestors,
  getImageDescendants,
  type ImageLineageEntry,
} from "./imageRelationships";

interface ProjectImageRecordState {
  projectPath: string;
  imageRecords: ImageRecordMap;
}

export interface SelectedImageRelationshipState {
  parentRecord: ImageRecord | null;
  ancestorRecords: ImageRecord[];
  descendantRecords: ImageLineageEntry[];
}

export const mergePersistedImageRecords = (
  currentRecords: ImageRecordMap | null | undefined,
  persistedRecords: ImageRecordMap | null | undefined,
): ImageRecordMap => ({
  ...(currentRecords ?? {}),
  ...(persistedRecords ?? {}),
});

export const mergePersistedProjectImageRecords = ({
  projectPath,
  projectImageRecords,
  activeProject,
  persistedRecords,
}: {
  projectPath: string;
  projectImageRecords: ImageRecordMap;
  activeProject: ProjectImageRecordState | null | undefined;
  persistedRecords: ImageRecordMap | null | undefined;
}) =>
  mergePersistedImageRecords(
    activeProject?.projectPath === projectPath
      ? activeProject.imageRecords
      : projectImageRecords,
    persistedRecords,
  );

export const buildActiveProjectImageRecordsUpdate = <
  Project extends ProjectImageRecordState,
>({
  projectPath,
  activeProject,
  nextImageRecords,
}: {
  projectPath: string;
  activeProject: Project | null | undefined;
  nextImageRecords: ImageRecordMap;
}): Project | null => {
  if (activeProject?.projectPath !== projectPath) {
    return null;
  }

  return {
    ...activeProject,
    imageRecords: nextImageRecords,
  };
};

export const buildPersistedProjectImageRecordsState = <
  Project extends ProjectImageRecordState,
>({
  projectPath,
  projectImageRecords,
  activeProject,
  persistedRecords,
}: {
  projectPath: string;
  projectImageRecords: ImageRecordMap;
  activeProject: Project | null | undefined;
  persistedRecords: ImageRecordMap | null | undefined;
}): {
  imageRecords: ImageRecordMap;
  activeProjectUpdate: Project | null;
} => {
  const imageRecords = mergePersistedProjectImageRecords({
    projectPath,
    projectImageRecords,
    activeProject,
    persistedRecords,
  });

  return {
    imageRecords,
    activeProjectUpdate: buildActiveProjectImageRecordsUpdate({
      projectPath,
      activeProject,
      nextImageRecords: imageRecords,
    }),
  };
};

export const applyPersistedProjectImageRecordsState = <
  Project extends ProjectImageRecordState,
>({
  projectPath,
  projectImageRecords,
  activeProject,
  persistedRecords,
  setActiveProject,
}: {
  projectPath: string;
  projectImageRecords: ImageRecordMap;
  activeProject: Project | null | undefined;
  persistedRecords: ImageRecordMap | null | undefined;
  setActiveProject: (project: Project) => void;
}) => {
  const state = buildPersistedProjectImageRecordsState({
    projectPath,
    projectImageRecords,
    activeProject,
    persistedRecords,
  });

  if (state.activeProjectUpdate) {
    setActiveProject(state.activeProjectUpdate);
  }

  return state;
};

export const buildSelectedImageRelationshipState = ({
  imageRecords,
  selectedRecord,
}: {
  imageRecords: ImageRecordMap | null | undefined;
  selectedRecord: ImageRecord | null;
}): SelectedImageRelationshipState => {
  if (!imageRecords || !selectedRecord) {
    return {
      parentRecord: null,
      ancestorRecords: [],
      descendantRecords: [],
    };
  }

  return {
    parentRecord: selectedRecord.parentFileId
      ? imageRecords[selectedRecord.parentFileId] || null
      : null,
    ancestorRecords: getImageAncestors(imageRecords, selectedRecord),
    descendantRecords: getImageDescendants(imageRecords, selectedRecord),
  };
};
