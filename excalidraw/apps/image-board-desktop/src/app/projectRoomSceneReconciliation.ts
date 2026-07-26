import { reconcileElements } from "@excalidraw/excalidraw/data/reconcile";
import {
  bumpElementVersions,
  restoreElements,
} from "@excalidraw/excalidraw/data/restore";

import type {
  ExcalidrawElement,
  OrderedExcalidrawElement,
} from "@excalidraw/element/types";
import type {
  ReconciledExcalidrawElement,
  RemoteExcalidrawElement,
} from "@excalidraw/excalidraw/data/reconcile";
import type { AppState } from "@excalidraw/excalidraw/types";

export const reconcileProjectRoomScene = ({
  localElements,
  remoteElements,
  appState,
  snapshot,
}: {
  localElements: readonly ExcalidrawElement[];
  remoteElements: readonly ExcalidrawElement[];
  appState: AppState;
  snapshot: boolean;
}): readonly ExcalidrawElement[] => {
  if (snapshot) {
    return restoreElements(remoteElements, localElements);
  }

  const restoredRemoteElements = restoreElements(
    remoteElements,
    localElements,
  ) as RemoteExcalidrawElement[];
  const reconciledElements = reconcileElements(
    localElements as readonly OrderedExcalidrawElement[],
    restoredRemoteElements,
    appState,
  ) as ReconciledExcalidrawElement[];

  return bumpElementVersions(reconciledElements, localElements);
};
