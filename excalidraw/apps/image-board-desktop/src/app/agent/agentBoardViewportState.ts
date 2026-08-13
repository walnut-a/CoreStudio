import type { AppState } from "@excalidraw/excalidraw/types";

export interface AgentBoardViewportState {
  scrollX: number;
  scrollY: number;
  zoom: AppState["zoom"];
}

type ViewportStorageReader = Pick<Storage, "getItem">;
type ViewportStorageWriter = Pick<Storage, "setItem">;
type ViewportStorageScope = {
  pageNonce?: string | null;
  sessionStorage?: ViewportStorageReader & Partial<ViewportStorageWriter>;
  persistentStorage?: ViewportStorageReader & Partial<ViewportStorageWriter>;
};

const viewportStorageKey = (stableBoardId: string) =>
  `corestudio:stable-board:${stableBoardId}:viewport`;
const pageViewportStorageKey = (stableBoardId: string, pageNonce: string) =>
  `corestudio:stable-board:${stableBoardId}:page:${pageNonce}:viewport`;

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

const readStoredViewport = (
  storage: ViewportStorageReader,
  key: string,
): AgentBoardViewportState | null => {
  try {
    const serialized = storage.getItem(key);
    return serialized ? parseViewportState(JSON.parse(serialized)) : null;
  } catch {
    return null;
  }
};

export const readAgentBoardViewportState = (
  stableBoardId: string,
  scope: ViewportStorageScope = {},
): AgentBoardViewportState | null => {
  if (scope.pageNonce) {
    const pageViewport = readStoredViewport(
      scope.sessionStorage ?? window.sessionStorage,
      pageViewportStorageKey(stableBoardId, scope.pageNonce),
    );
    if (pageViewport) {
      return pageViewport;
    }
  }
  return readStoredViewport(
    scope.persistentStorage ?? window.localStorage,
    viewportStorageKey(stableBoardId),
  );
};

export const writeAgentBoardViewportState = (
  stableBoardId: string,
  viewport: AgentBoardViewportState,
  scope: ViewportStorageScope = {},
): void => {
  if (
    !isFiniteNumber(viewport.scrollX) ||
    !isFiniteNumber(viewport.scrollY) ||
    !isFiniteNumber(viewport.zoom.value) ||
    viewport.zoom.value <= 0
  ) {
    return;
  }
  const serialized = JSON.stringify({
    version: 1,
    scrollX: viewport.scrollX,
    scrollY: viewport.scrollY,
    zoom: { value: viewport.zoom.value },
  });
  try {
    if (scope.pageNonce) {
      const sessionStorage = scope.sessionStorage ?? window.sessionStorage;
      sessionStorage.setItem?.(
        pageViewportStorageKey(stableBoardId, scope.pageNonce),
        serialized,
      );
    }
  } catch {
    // A disabled or full page store should not interrupt navigation.
  }
  try {
    const persistentStorage = scope.persistentStorage ?? window.localStorage;
    persistentStorage.setItem?.(viewportStorageKey(stableBoardId), serialized);
  } catch {
    // The durable fallback is best-effort for recreated browser sessions.
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
