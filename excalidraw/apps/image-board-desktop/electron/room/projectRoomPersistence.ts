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

class ProjectPathMissingError extends Error {
  public readonly code = "PROJECT_PATH_MISSING";
  public readonly details: {
    reason: "PROJECT_PATH_MISSING";
    projectPath: string;
    cause: string;
  };

  constructor(projectPath: string, cause: unknown) {
    super(
      `项目文件夹已被移动、改名或删除，保存已暂停。请停止编辑，将文件夹恢复到原路径，然后关闭项目以重试保存：${projectPath}`,
    );
    this.name = "ProjectPathMissingError";
    this.details = {
      reason: "PROJECT_PATH_MISSING",
      projectPath,
      cause: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isMissingPathError = (error: unknown) =>
  error instanceof Error &&
  "code" in error &&
  error.code === "ENOENT";

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
      try {
        await writeProjectScene({
          projectPath,
          sceneJson,
          expectedSceneHash: input.previousProjectRevision,
        });
      } catch (error) {
        if (isMissingPathError(error)) {
          throw new ProjectPathMissingError(projectPath, error);
        }
        throw error;
      }
      return {
        projectRevision: getSceneContentHash(sceneJson),
      };
    },
  };
};
