import type {
  ApplyProjectSceneElementPatchesResult,
  DesktopProjectBundle,
  ProjectSceneElementPatch,
} from "../shared/desktopBridgeTypes";

type SceneElementRecord = Record<string, unknown>;

const readElementIdentity = (element: SceneElementRecord) => ({
  id: typeof element.id === "string" ? element.id : null,
  version:
    typeof element.version === "number" && Number.isFinite(element.version)
      ? element.version
      : null,
  versionNonce:
    typeof element.versionNonce === "number" &&
    Number.isFinite(element.versionNonce)
      ? element.versionNonce
      : null,
});

export const readAgentBoardSceneElements = (
  sceneJson: string,
): SceneElementRecord[] => {
  try {
    const scene = JSON.parse(sceneJson) as { elements?: unknown };
    return Array.isArray(scene.elements)
      ? scene.elements.filter(
          (element): element is SceneElementRecord =>
            Boolean(element) &&
            typeof element === "object" &&
            !Array.isArray(element),
        )
      : [];
  } catch {
    return [];
  }
};

export const buildAgentBoardElementPatches = ({
  baselineElements,
  nextElements,
}: {
  baselineElements: readonly SceneElementRecord[];
  nextElements: readonly SceneElementRecord[];
}): ProjectSceneElementPatch[] => {
  const baselineById = new Map(
    baselineElements.flatMap((element) => {
      const identity = readElementIdentity(element);
      return identity.id ? [[identity.id, element] as const] : [];
    }),
  );

  return nextElements.flatMap((element) => {
    const nextIdentity = readElementIdentity(element);
    if (
      !nextIdentity.id ||
      nextIdentity.version === null ||
      nextIdentity.versionNonce === null
    ) {
      return [];
    }
    const baselineElement = baselineById.get(nextIdentity.id);
    if (
      baselineElement &&
      JSON.stringify(baselineElement) === JSON.stringify(element)
    ) {
      return [];
    }
    const baselineIdentity = baselineElement
      ? readElementIdentity(baselineElement)
      : null;
    return [
      {
        element,
        expectedVersion: baselineIdentity?.version ?? null,
        expectedVersionNonce: baselineIdentity?.versionNonce ?? null,
      },
    ];
  });
};

export const shouldScheduleAgentBoardElementPatch = ({
  baselineElements,
  nextElements,
}: {
  baselineElements: readonly SceneElementRecord[];
  nextElements: readonly SceneElementRecord[];
}) =>
  buildAgentBoardElementPatches({
    baselineElements,
    nextElements,
  }).length > 0;

export const runAgentBoardElementPatchScheduleAction = <
  Snapshot extends { elements: readonly unknown[] },
>({
  baselineElements,
  snapshot,
  cancelPending,
  schedule,
  setSaveStatus,
}: {
  baselineElements: readonly SceneElementRecord[];
  snapshot: Snapshot;
  cancelPending: () => unknown;
  schedule: (snapshot: Snapshot) => unknown;
  setSaveStatus: (status: "idle" | "saving") => void;
}) => {
  if (
    !shouldScheduleAgentBoardElementPatch({
      baselineElements,
      nextElements:
        snapshot.elements as unknown as readonly SceneElementRecord[],
    })
  ) {
    cancelPending();
    setSaveStatus("idle");
    return {
      status: "skipped" as const,
      reason: "unchanged-elements" as const,
    };
  }

  setSaveStatus("saving");
  schedule(snapshot);
  return { status: "scheduled" as const };
};

export const applyAgentBoardExternalProjectSnapshot = async ({
  sceneJson,
  getBaselineElements,
  setBaselineElements,
  applyProjectSnapshot,
}: {
  sceneJson: string;
  getBaselineElements: () => readonly SceneElementRecord[];
  setBaselineElements: (elements: SceneElementRecord[]) => void;
  applyProjectSnapshot: () => Promise<void>;
}) => {
  const previousBaselineElements = getBaselineElements();
  setBaselineElements(readAgentBoardSceneElements(sceneJson));
  try {
    await applyProjectSnapshot();
  } catch (error) {
    setBaselineElements([...previousBaselineElements]);
    throw error;
  }
};

export const writeAgentBoardElementPatchSnapshot = async ({
  snapshot,
  baselineElements,
  applyProjectSceneElementPatches,
  setBaselineElements,
  setSavedSceneHash,
  updateProject,
  createOperationId = () => crypto.randomUUID(),
}: {
  snapshot: {
    project: DesktopProjectBundle;
    elements: readonly SceneElementRecord[];
  };
  baselineElements: readonly SceneElementRecord[];
  applyProjectSceneElementPatches: (input: {
    projectPath: string;
    operationId: string;
    patches: ProjectSceneElementPatch[];
  }) => Promise<ApplyProjectSceneElementPatchesResult>;
  setBaselineElements: (elements: SceneElementRecord[]) => void;
  setSavedSceneHash: (sceneHash: string) => void;
  updateProject: (project: DesktopProjectBundle) => void;
  createOperationId?: () => string;
}) => {
  const patches = buildAgentBoardElementPatches({
    baselineElements,
    nextElements: snapshot.elements,
  });
  if (!patches.length) {
    return { status: "skipped" as const };
  }

  const result = await applyProjectSceneElementPatches({
    projectPath: snapshot.project.projectPath,
    operationId: createOperationId(),
    patches,
  });
  const persistedElements = readAgentBoardSceneElements(result.sceneJson);
  setBaselineElements(persistedElements);
  setSavedSceneHash(result.sceneHash);
  updateProject({
    ...snapshot.project,
    project: result.project,
    sceneJson: result.sceneJson,
  });
  return {
    status: "saved" as const,
    appliedElementIds: result.appliedElementIds,
  };
};
