import { describe, expect, it, vi } from "vitest";

import type { ImageRecord, ImageRecordMap } from "../shared/projectTypes";
import {
  applyPersistedProjectImageRecordsState,
  buildActiveProjectImageRecordsUpdate,
  buildPersistedProjectImageRecordsState,
  buildSelectedImageRelationshipState,
  mergePersistedImageRecords,
  mergePersistedProjectImageRecords,
} from "./imageRecordState";

const createImageRecord = (
  fileId: string,
  overrides: Partial<ImageRecord> = {},
): ImageRecord => ({
  fileId,
  assetPath: `assets/${fileId}.png`,
  sourceType: "imported",
  width: 512,
  height: 512,
  createdAt: "2026-07-04T00:00:00.000Z",
  mimeType: "image/png",
  ...overrides,
});

describe("mergePersistedImageRecords", () => {
  it("treats null and undefined maps as empty", () => {
    const persisted = {
      "file-1": createImageRecord("file-1"),
    };

    expect(mergePersistedImageRecords(null, persisted)).toEqual(persisted);
    expect(mergePersistedImageRecords(undefined, persisted)).toEqual(persisted);
    expect(mergePersistedImageRecords(persisted, null)).toEqual(persisted);
    expect(mergePersistedImageRecords(persisted, undefined)).toEqual(persisted);
  });

  it("keeps current records and appends persisted records", () => {
    const current: ImageRecordMap = {
      "file-1": createImageRecord("file-1"),
    };
    const persisted: ImageRecordMap = {
      "file-2": createImageRecord("file-2", { sourceType: "generated" }),
    };

    expect(mergePersistedImageRecords(current, persisted)).toEqual({
      ...current,
      ...persisted,
    });
  });

  it("lets persisted records replace stale current records for the same file", () => {
    const current: ImageRecordMap = {
      "file-1": createImageRecord("file-1", {
        assetPath: "assets/stale.png",
        width: 128,
      }),
    };
    const persisted: ImageRecordMap = {
      "file-1": createImageRecord("file-1", {
        assetPath: "assets/fresh.png",
        width: 1024,
      }),
    };

    expect(mergePersistedImageRecords(current, persisted)).toEqual(persisted);
  });
});

describe("mergePersistedProjectImageRecords", () => {
  it("uses active project records as the merge base when the active project matches", () => {
    const snapshotRecords: ImageRecordMap = {
      "snapshot-file": createImageRecord("snapshot-file"),
    };
    const activeRecords: ImageRecordMap = {
      "active-file": createImageRecord("active-file"),
    };
    const persistedRecords: ImageRecordMap = {
      "persisted-file": createImageRecord("persisted-file"),
    };

    expect(
      mergePersistedProjectImageRecords({
        projectPath: "/projects/current",
        projectImageRecords: snapshotRecords,
        activeProject: {
          projectPath: "/projects/current",
          imageRecords: activeRecords,
        },
        persistedRecords,
      }),
    ).toEqual({
      ...activeRecords,
      ...persistedRecords,
    });
  });

  it("falls back to project snapshot records when no active project matches", () => {
    const snapshotRecords: ImageRecordMap = {
      "snapshot-file": createImageRecord("snapshot-file"),
    };
    const activeRecords: ImageRecordMap = {
      "other-active-file": createImageRecord("other-active-file"),
    };
    const persistedRecords: ImageRecordMap = {
      "persisted-file": createImageRecord("persisted-file"),
    };

    expect(
      mergePersistedProjectImageRecords({
        projectPath: "/projects/current",
        projectImageRecords: snapshotRecords,
        activeProject: {
          projectPath: "/projects/other",
          imageRecords: activeRecords,
        },
        persistedRecords,
      }),
    ).toEqual({
      ...snapshotRecords,
      ...persistedRecords,
    });

    expect(
      mergePersistedProjectImageRecords({
        projectPath: "/projects/current",
        projectImageRecords: snapshotRecords,
        activeProject: null,
        persistedRecords,
      }),
    ).toEqual({
      ...snapshotRecords,
      ...persistedRecords,
    });
  });
});

describe("buildActiveProjectImageRecordsUpdate", () => {
  it("updates the active project image records when the project path matches", () => {
    const nextImageRecords: ImageRecordMap = {
      "next-file": createImageRecord("next-file"),
    };
    const activeProject = {
      projectPath: "/projects/current",
      imageRecords: {
        "old-file": createImageRecord("old-file"),
      },
      name: "当前项目",
    };

    expect(
      buildActiveProjectImageRecordsUpdate({
        projectPath: "/projects/current",
        activeProject,
        nextImageRecords,
      }),
    ).toEqual({
      ...activeProject,
      imageRecords: nextImageRecords,
    });
  });

  it("returns null when the active project no longer matches", () => {
    expect(
      buildActiveProjectImageRecordsUpdate({
        projectPath: "/projects/current",
        activeProject: {
          projectPath: "/projects/other",
          imageRecords: {},
        },
        nextImageRecords: {
          "next-file": createImageRecord("next-file"),
        },
      }),
    ).toBeNull();

    expect(
      buildActiveProjectImageRecordsUpdate({
        projectPath: "/projects/current",
        activeProject: null,
        nextImageRecords: {
          "next-file": createImageRecord("next-file"),
        },
      }),
    ).toBeNull();
  });
});

describe("buildPersistedProjectImageRecordsState", () => {
  it("merges persisted records into the active project when the project still matches", () => {
    const snapshotRecords: ImageRecordMap = {
      "snapshot-file": createImageRecord("snapshot-file"),
    };
    const activeProject = {
      projectPath: "/projects/current",
      imageRecords: {
        "active-file": createImageRecord("active-file"),
      },
      name: "当前项目",
    };
    const persistedRecords: ImageRecordMap = {
      "persisted-file": createImageRecord("persisted-file"),
    };

    expect(
      buildPersistedProjectImageRecordsState({
        projectPath: "/projects/current",
        projectImageRecords: snapshotRecords,
        activeProject,
        persistedRecords,
      }),
    ).toEqual({
      imageRecords: {
        ...activeProject.imageRecords,
        ...persistedRecords,
      },
      activeProjectUpdate: {
        ...activeProject,
        imageRecords: {
          ...activeProject.imageRecords,
          ...persistedRecords,
        },
      },
    });
  });

  it("keeps the snapshot records and does not update active project after a project switch", () => {
    const snapshotRecords: ImageRecordMap = {
      "snapshot-file": createImageRecord("snapshot-file"),
    };
    const activeProject = {
      projectPath: "/projects/other",
      imageRecords: {
        "other-file": createImageRecord("other-file"),
      },
      name: "其他项目",
    };
    const persistedRecords: ImageRecordMap = {
      "persisted-file": createImageRecord("persisted-file"),
    };

    expect(
      buildPersistedProjectImageRecordsState({
        projectPath: "/projects/current",
        projectImageRecords: snapshotRecords,
        activeProject,
        persistedRecords,
      }),
    ).toEqual({
      imageRecords: {
        ...snapshotRecords,
        ...persistedRecords,
      },
      activeProjectUpdate: null,
    });
  });
});

describe("applyPersistedProjectImageRecordsState", () => {
  it("applies the active project update and returns the merged image records", () => {
    const snapshotRecords: ImageRecordMap = {
      "snapshot-file": createImageRecord("snapshot-file"),
    };
    const activeProject = {
      projectPath: "/projects/current",
      imageRecords: {
        "active-file": createImageRecord("active-file"),
      },
      name: "当前项目",
    };
    const persistedRecords: ImageRecordMap = {
      "persisted-file": createImageRecord("persisted-file"),
    };
    const setActiveProject = vi.fn();

    const state = applyPersistedProjectImageRecordsState({
      projectPath: "/projects/current",
      projectImageRecords: snapshotRecords,
      activeProject,
      persistedRecords,
      setActiveProject,
    });

    expect(state.imageRecords).toEqual({
      ...activeProject.imageRecords,
      ...persistedRecords,
    });
    expect(setActiveProject).toHaveBeenCalledTimes(1);
    expect(setActiveProject).toHaveBeenCalledWith({
      ...activeProject,
      imageRecords: state.imageRecords,
    });
  });

  it("does not apply an active project update after a project switch", () => {
    const snapshotRecords: ImageRecordMap = {
      "snapshot-file": createImageRecord("snapshot-file"),
    };
    const persistedRecords: ImageRecordMap = {
      "persisted-file": createImageRecord("persisted-file"),
    };
    const setActiveProject = vi.fn();

    const state = applyPersistedProjectImageRecordsState({
      projectPath: "/projects/current",
      projectImageRecords: snapshotRecords,
      activeProject: {
        projectPath: "/projects/other",
        imageRecords: {
          "other-file": createImageRecord("other-file"),
        },
      },
      persistedRecords,
      setActiveProject,
    });

    expect(state.imageRecords).toEqual({
      ...snapshotRecords,
      ...persistedRecords,
    });
    expect(state.activeProjectUpdate).toBeNull();
    expect(setActiveProject).not.toHaveBeenCalled();
  });
});

describe("buildSelectedImageRelationshipState", () => {
  it("builds parent, ancestor, and descendant records for the selected image", () => {
    const grandParent = createImageRecord("grand-parent", {
      createdAt: "2026-07-04T00:00:00.000Z",
    });
    const parent = createImageRecord("parent", {
      parentFileId: grandParent.fileId,
      createdAt: "2026-07-04T00:01:00.000Z",
    });
    const selected = createImageRecord("selected", {
      parentFileId: parent.fileId,
      createdAt: "2026-07-04T00:02:00.000Z",
    });
    const laterChild = createImageRecord("later-child", {
      parentFileId: selected.fileId,
      createdAt: "2026-07-04T00:04:00.000Z",
    });
    const earlierChild = createImageRecord("earlier-child", {
      parentFileId: selected.fileId,
      createdAt: "2026-07-04T00:03:00.000Z",
    });
    const grandChild = createImageRecord("grand-child", {
      parentFileId: earlierChild.fileId,
      createdAt: "2026-07-04T00:05:00.000Z",
    });

    expect(
      buildSelectedImageRelationshipState({
        imageRecords: {
          [selected.fileId]: selected,
          [parent.fileId]: parent,
          [grandParent.fileId]: grandParent,
          [laterChild.fileId]: laterChild,
          [earlierChild.fileId]: earlierChild,
          [grandChild.fileId]: grandChild,
        },
        selectedRecord: selected,
      }),
    ).toEqual({
      parentRecord: parent,
      ancestorRecords: [grandParent, parent],
      descendantRecords: [
        { record: earlierChild, depth: 0 },
        { record: grandChild, depth: 1 },
        { record: laterChild, depth: 0 },
      ],
    });
  });

  it("returns empty relationship state when there is no selected image or no records", () => {
    expect(
      buildSelectedImageRelationshipState({
        imageRecords: {},
        selectedRecord: null,
      }),
    ).toEqual({
      parentRecord: null,
      ancestorRecords: [],
      descendantRecords: [],
    });
    expect(
      buildSelectedImageRelationshipState({
        imageRecords: null,
        selectedRecord: createImageRecord("selected"),
      }),
    ).toEqual({
      parentRecord: null,
      ancestorRecords: [],
      descendantRecords: [],
    });
  });
});
