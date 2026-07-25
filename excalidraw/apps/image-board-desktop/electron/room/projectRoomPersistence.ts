import {
  isProjectRoomSceneElement,
  type ProjectRoomScene,
} from "../../src/shared/projectRoomProtocol";
import { getSceneContentHash } from "../../src/shared/sceneVersion";

import type {
  PersistProjectRoomInput,
  PersistProjectRoomResult,
} from "./projectRoom";

interface ProjectSceneWriteInput {
  projectPath: string;
  sceneJson: string;
  expectedSceneHash?: string | null;
}

export interface CreateProjectRoomPersistenceInput {
  projectPath: string;
  initialSceneJson: string;
  writeProjectScene: (input: ProjectSceneWriteInput) => Promise<unknown>;
}

export interface ProjectRoomPersistenceAdapter {
  initialScene: ProjectRoomScene;
  initialProjectRevision: string;
  persist: (
    input: PersistProjectRoomInput,
  ) => Promise<PersistProjectRoomResult>;
}

class ProjectRoomPersistenceError extends Error {
  public readonly code = "ROOM_SCENE_INVALID";

  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = "ProjectRoomPersistenceError";
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseInitialScene = (sceneJson: string) => {
  let document: Record<string, unknown>;
  try {
    const parsed = JSON.parse(sceneJson) as unknown;
    if (!isObject(parsed)) {
      throw new Error("scene root is not an object");
    }
    document = parsed;
  } catch (error) {
    throw new ProjectRoomPersistenceError(
      "The persisted project scene cannot initialize a room.",
      { cause: error instanceof Error ? error.message : String(error) },
    );
  }

  if (
    !Array.isArray(document.elements) ||
    !document.elements.every(isProjectRoomSceneElement)
  ) {
    throw new ProjectRoomPersistenceError(
      "The persisted project scene contains invalid elements.",
    );
  }

  return {
    document,
    scene: {
      elements: structuredClone(document.elements),
      sharedSceneConfig: isObject(document.appState)
        ? structuredClone(document.appState)
        : {},
    } satisfies ProjectRoomScene,
  };
};

export const createProjectRoomPersistence = ({
  projectPath,
  initialSceneJson,
  writeProjectScene,
}: CreateProjectRoomPersistenceInput): ProjectRoomPersistenceAdapter => {
  const { document, scene } = parseInitialScene(initialSceneJson);

  return {
    initialScene: scene,
    initialProjectRevision: getSceneContentHash(initialSceneJson),
    persist: async (input) => {
      const sceneJson = JSON.stringify(
        {
          ...document,
          elements: input.scene.elements,
          appState: input.scene.sharedSceneConfig,
        },
        null,
        2,
      );
      await writeProjectScene({
        projectPath,
        sceneJson,
        expectedSceneHash: input.previousProjectRevision,
      });
      return {
        projectRevision: getSceneContentHash(sceneJson),
      };
    },
  };
};
