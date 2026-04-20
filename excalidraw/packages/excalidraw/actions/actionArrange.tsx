import { getNonDeletedElements } from "@excalidraw/element";

import { isFrameLikeElement } from "@excalidraw/element";

import { updateFrameMembershipOfSelectedElements } from "@excalidraw/element";

import { KEYS, arrayToMap } from "@excalidraw/common";

import { arrangeElementsIntoColumnGrid } from "@excalidraw/element";

import { CaptureUpdateAction } from "@excalidraw/element";

import { getSelectedElementsByArrangementUnit } from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { ToolButton } from "../components/ToolButton";
import { gridIcon } from "../components/icons";

import { t } from "../i18n";

import { isSomeElementSelected } from "../scene";

import { getShortcutKey } from "../shortcut";

import { register } from "./register";

import type { AppClassProperties, AppState, UIAppState } from "../types";

export const arrangeActionsPredicate = (
  appState: UIAppState,
  app: AppClassProperties,
) => {
  const selectedElements = app.scene.getSelectedElements(appState);
  return (
    getSelectedElementsByArrangementUnit(
      selectedElements,
      app.scene.getNonDeletedElementsMap(),
      appState as Readonly<AppState>,
    ).length > 1 &&
    !selectedElements.some((element) => isFrameLikeElement(element))
  );
};

const arrangeSelectedElements = (
  elements: readonly ExcalidrawElement[],
  appState: Readonly<AppState>,
  app: AppClassProperties,
) => {
  const selectedElements = app.scene.getSelectedElements(appState);

  const updatedElements = arrangeElementsIntoColumnGrid(
    selectedElements,
    app.scene.getNonDeletedElementsMap(),
    appState,
    app.scene,
  );

  const updatedElementsMap = arrayToMap(updatedElements);

  return updateFrameMembershipOfSelectedElements(
    elements.map((element) => updatedElementsMap.get(element.id) || element),
    appState,
    app,
  );
};

export const actionArrangeIntoGrid = register({
  name: "arrangeIntoGrid",
  label: "labels.arrangeIntoGrid",
  icon: gridIcon,
  trackEvent: { category: "element" },
  predicate: (elements, appState, appProps, app) =>
    arrangeActionsPredicate(appState, app),
  perform: (elements, appState, _, app) => {
    return {
      appState,
      elements: arrangeSelectedElements(elements, appState, app),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  keyTest: (event) =>
    !event[KEYS.CTRL_OR_CMD] &&
    !event.shiftKey &&
    event.altKey &&
    event.key.toLowerCase() === KEYS.G,
  PanelComponent: ({ elements, appState, updateData, app }) => (
    <ToolButton
      hidden={!arrangeActionsPredicate(appState, app)}
      type="button"
      icon={gridIcon}
      onClick={() => updateData(null)}
      title={`${t("labels.arrangeIntoGrid")} — ${getShortcutKey("Alt+G")}`}
      aria-label={t("labels.arrangeIntoGrid")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    />
  ),
});
