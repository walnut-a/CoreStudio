import { describe, expect, it } from "vitest";

import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";
import type { ProjectManifest } from "../shared/projectTypes";
import { getSceneContentHash } from "../shared/sceneVersion";
import {
  buildCurrentProjectChangedResetState,
  buildCurrentProjectLifecycleState,
  buildCurrentProjectUpdateState,
  buildEditorInitializingUpdatePlan,
  formatProjectCreateError,
  formatProjectImportImagesError,
  formatProjectOpenError,
  formatProjectRevealError,
  formatProjectSaveBeforeOpenError,
  formatProjectSaveError,
  scheduleEditorInitializingFallbackClearAction,
  scheduleEditorReadyInitializingClearAction,
  getNextProjectOpenSequence,
  isProjectOpenSequenceCurrent,
  shouldHideEditorLoading,
} from "./currentProjectState";

const createProjectManifest = (
  name: string,
  overrides: Partial<ProjectManifest> = {},
): ProjectManifest => ({
  formatVersion: 1,
  appVersion: "test",
  name,
  createdAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-07-04T00:00:00.000Z",
  sceneFile: "scene.excalidraw.json",
  imageRecordsFile: "image-records.json",
  assetsDir: "assets",
  exportsDir: "exports",
  agentAccess: {
    token: `${name}-token`,
    enabled: true,
  },
  ...overrides,
});

const createProject = ({
  path,
  name = "工业设计助手",
  sceneJson = "{}",
}: {
  path: string;
  name?: string;
  sceneJson?: string;
}): DesktopProjectBundle => ({
  projectPath: path,
  project: createProjectManifest(name),
  sceneJson,
  imageRecords: {},
});

describe("buildCurrentProjectLifecycleState", () => {
  it("detects a project switch and computes the saved scene hash", () => {
    const nextProject = createProject({
      path: "/projects/next",
      sceneJson: '{"elements":[{"id":"image-1"}]}',
    });

    expect(
      buildCurrentProjectLifecycleState({
        previousProject: createProject({ path: "/projects/previous" }),
        nextProject,
      }),
    ).toEqual({
      previousProjectPath: "/projects/previous",
      nextProjectPath: "/projects/next",
      projectChanged: true,
      savedSceneHash: getSceneContentHash(nextProject.sceneJson),
    });
  });

  it("does not mark a project changed when the path is unchanged", () => {
    const nextProject = createProject({
      path: "/projects/current",
      sceneJson: '{"elements":[{"id":"image-2"}]}',
    });

    expect(
      buildCurrentProjectLifecycleState({
        previousProject: createProject({ path: "/projects/current" }),
        nextProject,
      }),
    ).toEqual({
      previousProjectPath: "/projects/current",
      nextProjectPath: "/projects/current",
      projectChanged: false,
      savedSceneHash: getSceneContentHash(nextProject.sceneJson),
    });
  });

  it("clears the saved scene hash when closing the current project", () => {
    expect(
      buildCurrentProjectLifecycleState({
        previousProject: createProject({ path: "/projects/current" }),
        nextProject: null,
      }),
    ).toEqual({
      previousProjectPath: "/projects/current",
      nextProjectPath: null,
      projectChanged: true,
      savedSceneHash: null,
    });
  });
});

describe("buildCurrentProjectChangedResetState", () => {
  it("builds the UI reset state applied when the active project path changes", () => {
    expect(buildCurrentProjectChangedResetState()).toEqual({
      activeAcpThreadId: null,
      acpRunLogTaskId: null,
      acpRunLogSurface: null,
      acpRunLogDetail: null,
      acpRunLogError: null,
      acpConversationEntries: [],
      acpThreadSummaries: [],
      acpThreadSummariesError: null,
      acpThreadSummariesLoading: false,
      agentChatDockOpen: false,
      projectHealthReport: null,
      projectRepairReport: null,
      projectHealthReportOpen: false,
    });
  });
});

describe("buildCurrentProjectUpdateState", () => {
  it("includes reset state when switching to another project", () => {
    const nextProject = createProject({
      path: "/projects/next",
      sceneJson: '{"elements":[{"id":"next"}]}',
    });

    expect(
      buildCurrentProjectUpdateState({
        previousProject: createProject({ path: "/projects/previous" }),
        nextProject,
      }),
    ).toEqual({
      project: nextProject,
      previousProjectPath: "/projects/previous",
      nextProjectPath: "/projects/next",
      projectChanged: true,
      savedSceneHash: getSceneContentHash(nextProject.sceneJson),
      resetState: buildCurrentProjectChangedResetState(),
    });
  });

  it("omits reset state when updating the same project", () => {
    const nextProject = createProject({
      path: "/projects/current",
      sceneJson: '{"elements":[{"id":"updated"}]}',
    });

    expect(
      buildCurrentProjectUpdateState({
        previousProject: createProject({ path: "/projects/current" }),
        nextProject,
      }),
    ).toEqual({
      project: nextProject,
      previousProjectPath: "/projects/current",
      nextProjectPath: "/projects/current",
      projectChanged: false,
      savedSceneHash: getSceneContentHash(nextProject.sceneJson),
      resetState: null,
    });
  });
});

describe("project open sequence helpers", () => {
  it("increments the project open sequence and identifies the current request", () => {
    const nextSequence = getNextProjectOpenSequence(4);

    expect(nextSequence).toBe(5);
    expect(
      isProjectOpenSequenceCurrent({
        currentSequence: nextSequence,
        sequence: 5,
      }),
    ).toBe(true);
    expect(
      isProjectOpenSequenceCurrent({
        currentSequence: nextSequence,
        sequence: 4,
      }),
    ).toBe(false);
  });
});

describe("project action error formatting", () => {
  it("formats project action failures with owner fallback messages", () => {
    expect(formatProjectSaveError(null)).toBe("项目保存失败。");
    expect(formatProjectOpenError(null)).toBe("打开项目失败。");
    expect(formatProjectCreateError(null)).toBe("新建项目失败。");
    expect(formatProjectImportImagesError(null)).toBe("导入图片失败。");
    expect(formatProjectRevealError(null)).toBe("无法显示项目文件夹。");
  });

  it("preserves the original failure reason when a project action reports one", () => {
    expect(formatProjectOpenError(new Error("项目文件损坏"))).toBe(
      "项目文件损坏",
    );
    expect(formatProjectImportImagesError("读取剪贴板失败")).toBe(
      "读取剪贴板失败",
    );
  });

  it("formats missing project-list entries without exposing the internal marker", () => {
    expect(
      formatProjectOpenError(
        new Error(
          "[CORESTUDIO_MISSING_RECENT_PROJECT]这个项目文件夹已经不存在，可能已被移动或手动删除。CoreStudio 已从项目列表移除这条记录。\n\n如果项目只是换了位置，请点击“打开项目”重新选择新的文件夹。",
        ),
      ),
    ).toBe(
      "这个项目文件夹已经不存在，可能已被移动或手动删除。CoreStudio 已从项目列表移除这条记录。\n\n如果项目只是换了位置，请点击“打开项目”重新选择新的文件夹。",
    );
  });

  it("formats save-before-open failures as a single project owner message", () => {
    expect(formatProjectSaveBeforeOpenError(new Error("写入失败"))).toBe(
      "旧项目未能保存，已停止打开新项目。 写入失败",
    );
    expect(formatProjectSaveBeforeOpenError(null)).toBe(
      "旧项目未能保存，已停止打开新项目。 项目保存失败。",
    );
  });
});

describe("buildEditorInitializingUpdatePlan", () => {
  it("starts editor initialization and stores the provided render nonce", () => {
    expect(
      buildEditorInitializingUpdatePlan({
        currentRenderNonce: null,
        initializing: true,
        renderNonce: 7,
      }),
    ).toEqual({
      shouldApply: true,
      nextInitializing: true,
      nextRenderNonce: 7,
    });
  });

  it("keeps the current render nonce when initialization starts without a nonce", () => {
    expect(
      buildEditorInitializingUpdatePlan({
        currentRenderNonce: 7,
        initializing: true,
      }),
    ).toEqual({
      shouldApply: true,
      nextInitializing: true,
      nextRenderNonce: 7,
    });
  });

  it("ignores stale completion from an older render nonce", () => {
    expect(
      buildEditorInitializingUpdatePlan({
        currentRenderNonce: 8,
        initializing: false,
        renderNonce: 7,
      }),
    ).toEqual({
      shouldApply: false,
      nextInitializing: false,
      nextRenderNonce: 8,
    });
  });

  it("clears initialization for the current render nonce", () => {
    expect(
      buildEditorInitializingUpdatePlan({
        currentRenderNonce: 8,
        initializing: false,
        renderNonce: 8,
      }),
    ).toEqual({
      shouldApply: true,
      nextInitializing: false,
      nextRenderNonce: null,
    });
  });
});

describe("shouldHideEditorLoading", () => {
  it("only hides the loading state for the active render nonce", () => {
    expect(
      shouldHideEditorLoading({
        currentRenderNonce: 3,
        renderNonce: 3,
      }),
    ).toBe(true);
    expect(
      shouldHideEditorLoading({
        currentRenderNonce: 4,
        renderNonce: 3,
      }),
    ).toBe(false);
  });
});

describe("scheduleEditorReadyInitializingClearAction", () => {
  it("uses requestAnimationFrame when available to clear the current render loading state", () => {
    const callbacks: FrameRequestCallback[] = [];
    const clearedRenderNonces: number[] = [];
    const timeoutCalls: number[] = [];

    scheduleEditorReadyInitializingClearAction({
      renderNonce: 12,
      requestAnimationFrame: (callback) => {
        callbacks.push(callback);
        return callbacks.length;
      },
      scheduleTimeout: (_callback, delay) => {
        timeoutCalls.push(delay);
        return timeoutCalls.length;
      },
      clearInitializing: (renderNonce) => {
        clearedRenderNonces.push(renderNonce);
      },
    });

    expect(timeoutCalls).toEqual([]);
    expect(clearedRenderNonces).toEqual([]);

    callbacks[0]?.(0);

    expect(clearedRenderNonces).toEqual([12]);
  });

  it("falls back to a zero-delay timer when requestAnimationFrame is unavailable", () => {
    const callbacks: Array<() => void> = [];
    const delays: number[] = [];
    const clearedRenderNonces: number[] = [];

    scheduleEditorReadyInitializingClearAction({
      renderNonce: 13,
      requestAnimationFrame: null,
      scheduleTimeout: (callback, delay) => {
        callbacks.push(callback);
        delays.push(delay);
        return callbacks.length;
      },
      clearInitializing: (renderNonce) => {
        clearedRenderNonces.push(renderNonce);
      },
    });

    expect(delays).toEqual([0]);
    expect(clearedRenderNonces).toEqual([]);

    callbacks[0]?.();

    expect(clearedRenderNonces).toEqual([13]);
  });
});

describe("scheduleEditorInitializingFallbackClearAction", () => {
  it("does not schedule a fallback timer when the editor is not initializing", () => {
    const cleanup = scheduleEditorInitializingFallbackClearAction({
      isEditorInitializing: false,
      renderNonce: 2,
      getCurrentRenderNonce: () => 2,
      hasEditorApi: () => true,
      scheduleTimeout: () => 1,
      clearTimeout: () => undefined,
      hideEditorLoading: () => undefined,
    });

    expect(cleanup).toBeNull();
  });

  it("hides loading after the fallback delay when the editor API exists for the active render", () => {
    const scheduledCallbacks: Array<() => void> = [];
    const delays: number[] = [];
    const hiddenRenderNonces: number[] = [];

    const cleanup = scheduleEditorInitializingFallbackClearAction({
      isEditorInitializing: true,
      renderNonce: 21,
      getCurrentRenderNonce: () => 21,
      hasEditorApi: () => true,
      scheduleTimeout: (callback, delay) => {
        scheduledCallbacks.push(callback);
        delays.push(delay);
        return 42;
      },
      clearTimeout: () => undefined,
      hideEditorLoading: (renderNonce) => {
        hiddenRenderNonces.push(renderNonce);
      },
    });

    expect(cleanup).toEqual(expect.any(Function));
    expect(delays).toEqual([3000]);

    expect(scheduledCallbacks).toHaveLength(1);
    scheduledCallbacks[0]?.();

    expect(hiddenRenderNonces).toEqual([21]);
  });

  it("ignores fallback callbacks for stale renders or missing editor APIs", () => {
    const hiddenRenderNonces: number[] = [];
    const callbacks: Array<() => void> = [];

    scheduleEditorInitializingFallbackClearAction({
      isEditorInitializing: true,
      renderNonce: 21,
      getCurrentRenderNonce: () => 22,
      hasEditorApi: () => true,
      scheduleTimeout: (callback) => {
        callbacks.push(callback);
        return callbacks.length;
      },
      clearTimeout: () => undefined,
      hideEditorLoading: (renderNonce) => {
        hiddenRenderNonces.push(renderNonce);
      },
    });

    scheduleEditorInitializingFallbackClearAction({
      isEditorInitializing: true,
      renderNonce: 23,
      getCurrentRenderNonce: () => 23,
      hasEditorApi: () => false,
      scheduleTimeout: (callback) => {
        callbacks.push(callback);
        return callbacks.length;
      },
      clearTimeout: () => undefined,
      hideEditorLoading: (renderNonce) => {
        hiddenRenderNonces.push(renderNonce);
      },
    });

    callbacks.forEach((callback) => callback());

    expect(hiddenRenderNonces).toEqual([]);
  });

  it("clears the scheduled fallback timer from its cleanup callback", () => {
    const clearedTimerIds: number[] = [];

    const cleanup = scheduleEditorInitializingFallbackClearAction({
      isEditorInitializing: true,
      renderNonce: 8,
      getCurrentRenderNonce: () => 8,
      hasEditorApi: () => true,
      scheduleTimeout: () => 99,
      clearTimeout: (timerId) => {
        clearedTimerIds.push(timerId);
      },
      hideEditorLoading: () => undefined,
    });

    cleanup?.();

    expect(clearedTimerIds).toEqual([99]);
  });
});
