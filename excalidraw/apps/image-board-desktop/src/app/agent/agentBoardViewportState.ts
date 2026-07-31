import type { AppState } from "@excalidraw/excalidraw/types";

export interface AgentBoardViewportState {
  scrollX: number;
  scrollY: number;
  zoom: AppState["zoom"];
}

type ViewportStorageReader = Pick<Storage, "getItem">;
type ViewportStorageWriter = Pick<Storage, "setItem">;

const viewportStorageKey = (stableBoardId: string) =>
  `corestudio:stable-board:${stableBoardId}:viewport`;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const parseViewportState = (value: unknown): AgentBoardViewportState | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as {
    version?: unknown;
    scrollX?: unknown;
    scrollY?: unknown;
    zoom?: { value?: unknown };
  };
  if (
    candidate.version !== 1 ||
    !isFiniteNumber(candidate.scrollX) ||
    !isFiniteNumber(candidate.scrollY) ||
    !candidate.zoom ||
    !isFiniteNumber(candidate.zoom.value) ||
    candidate.zoom.value <= 0
  ) {
    return null;
  }
  return {
    scrollX: candidate.scrollX,
    scrollY: candidate.scrollY,
    zoom: { value: candidate.zoom.value } as AppState["zoom"],
  };
};

export const readAgentBoardViewportState = (
  stableBoardId: string,
  storage?: ViewportStorageReader,
): AgentBoardViewportState | null => {
  try {
    const serialized = (storage ?? window.localStorage).getItem(
      viewportStorageKey(stableBoardId),
    );
    return serialized ? parseViewportState(JSON.parse(serialized)) : null;
  } catch {
    return null;
  }
};

export const writeAgentBoardViewportState = (
  stableBoardId: string,
  viewport: AgentBoardViewportState,
  storage?: ViewportStorageWriter,
): void => {
  if (
    !isFiniteNumber(viewport.scrollX) ||
    !isFiniteNumber(viewport.scrollY) ||
    !isFiniteNumber(viewport.zoom.value) ||
    viewport.zoom.value <= 0
  ) {
    return;
  }
  try {
    (storage ?? window.localStorage).setItem(
      viewportStorageKey(stableBoardId),
      JSON.stringify({
        version: 1,
        scrollX: viewport.scrollX,
        scrollY: viewport.scrollY,
        zoom: { value: viewport.zoom.value },
      }),
    );
  } catch {
    // A disabled or full persistent store should not interrupt navigation.
  }
};

export const mergeAgentBoardInitialAppState = (
  sharedSceneConfig: Record<string, unknown>,
  savedViewport: AgentBoardViewportState | null,
): Record<string, unknown> => ({
  ...sharedSceneConfig,
  ...(savedViewport ?? {}),
});

export const mergeAgentBoardAuthoritativeAppState = (
  currentAppState: AppState,
  sharedSceneConfig: Record<string, unknown>,
): AppState =>
  ({
    ...currentAppState,
    ...sharedSceneConfig,
    scrollX: currentAppState.scrollX,
    scrollY: currentAppState.scrollY,
    zoom: currentAppState.zoom,
  } as AppState);
