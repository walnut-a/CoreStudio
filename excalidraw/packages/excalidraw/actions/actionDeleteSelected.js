"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionDeleteSelected = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const element_7 = require("@excalidraw/element");
const element_8 = require("@excalidraw/element");
const element_9 = require("@excalidraw/element");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const icons_1 = require("../components/icons");
const ToolButton_1 = require("../components/ToolButton");
const App_1 = require("../components/App");
const register_1 = require("./register");
const deleteSelectedElements = (elements, appState, app) => {
    const framesToBeDeleted = new Set((0, scene_1.getSelectedElements)(elements.filter((el) => (0, element_6.isFrameLikeElement)(el)), appState).map((el) => el.id));
    const selectedElementIds = {};
    const elementsMap = app.scene.getNonDeletedElementsMap();
    const processedElements = new Set();
    for (const frameId of framesToBeDeleted) {
        const frameChildren = (0, element_7.getFrameChildren)(elements, frameId);
        for (const el of frameChildren) {
            if (processedElements.has(el.id)) {
                continue;
            }
            if ((0, element_6.isBoundToContainer)(el)) {
                const containerElement = (0, element_5.getContainerElement)(el, elementsMap);
                if (containerElement) {
                    selectedElementIds[containerElement.id] = true;
                }
            }
            else {
                selectedElementIds[el.id] = true;
            }
            processedElements.add(el.id);
        }
    }
    let shouldSelectEditingGroup = true;
    const nextElements = elements.map((el) => {
        if (appState.selectedElementIds[el.id]) {
            const boundElement = (0, element_6.isBoundToContainer)(el)
                ? (0, element_5.getContainerElement)(el, elementsMap)
                : null;
            if (el.frameId && framesToBeDeleted.has(el.frameId)) {
                shouldSelectEditingGroup = false;
                selectedElementIds[el.id] = true;
                return el;
            }
            if (boundElement?.frameId &&
                framesToBeDeleted.has(boundElement?.frameId)) {
                return el;
            }
            if (el.boundElements) {
                el.boundElements.forEach((candidate) => {
                    const bound = app.scene.getNonDeletedElementsMap().get(candidate.id);
                    if (bound && (0, element_6.isElbowArrow)(bound)) {
                        app.scene.mutateElement(bound, {
                            startBinding: el.id === bound.startBinding?.elementId
                                ? null
                                : bound.startBinding,
                            endBinding: el.id === bound.endBinding?.elementId ? null : bound.endBinding,
                        });
                    }
                });
            }
            return (0, element_4.newElementWith)(el, { isDeleted: true });
        }
        // if deleting a frame, remove the children from it and select them
        if (el.frameId && framesToBeDeleted.has(el.frameId)) {
            shouldSelectEditingGroup = false;
            if (!(0, element_6.isBoundToContainer)(el)) {
                selectedElementIds[el.id] = true;
            }
            return (0, element_4.newElementWith)(el, { frameId: null });
        }
        if ((0, element_6.isBoundToContainer)(el) && appState.selectedElementIds[el.containerId]) {
            return (0, element_4.newElementWith)(el, { isDeleted: true });
        }
        return el;
    });
    let nextEditingGroupId = appState.editingGroupId;
    // select next eligible element in currently editing group or supergroup
    if (shouldSelectEditingGroup && appState.editingGroupId) {
        const elems = (0, element_8.getElementsInGroup)(nextElements, appState.editingGroupId).filter((el) => !el.isDeleted);
        if (elems.length > 1) {
            if (elems[0]) {
                selectedElementIds[elems[0].id] = true;
            }
        }
        else {
            nextEditingGroupId = null;
            if (elems[0]) {
                selectedElementIds[elems[0].id] = true;
            }
            const lastElementInGroup = elems[0];
            if (lastElementInGroup) {
                const editingGroupIdx = lastElementInGroup.groupIds.findIndex((groupId) => {
                    return groupId === appState.editingGroupId;
                });
                const superGroupId = lastElementInGroup.groupIds[editingGroupIdx + 1];
                if (superGroupId) {
                    const elems = (0, element_8.getElementsInGroup)(nextElements, superGroupId).filter((el) => !el.isDeleted);
                    if (elems.length > 1) {
                        nextEditingGroupId = superGroupId;
                        elems.forEach((el) => {
                            selectedElementIds[el.id] = true;
                        });
                    }
                }
            }
        }
    }
    return {
        elements: nextElements,
        appState: {
            ...appState,
            ...(0, element_8.selectGroupsForSelectedElements)({
                selectedElementIds,
                editingGroupId: nextEditingGroupId,
            }, nextElements, appState, null),
        },
    };
};
const handleGroupEditingState = (appState, elements) => {
    if (appState.editingGroupId) {
        const siblingElements = (0, element_8.getElementsInGroup)((0, element_1.getNonDeletedElements)(elements), appState.editingGroupId);
        if (siblingElements.length) {
            return {
                ...appState,
                selectedElementIds: { [siblingElements[0].id]: true },
            };
        }
    }
    return appState;
};
exports.actionDeleteSelected = (0, register_1.register)({
    name: "deleteSelectedElements",
    label: "labels.delete",
    icon: icons_1.TrashIcon,
    trackEvent: { category: "element", action: "delete" },
    perform: (elements, appState, formData, app) => {
        if (appState.selectedLinearElement?.isEditing) {
            const { elementId, selectedPointsIndices } = appState.selectedLinearElement;
            const elementsMap = app.scene.getNonDeletedElementsMap();
            const linearElement = element_3.LinearElementEditor.getElement(elementId, elementsMap);
            if (!linearElement) {
                return false;
            }
            // case: no point selected → do nothing, as deleting the whole element
            // is most likely a mistake, where you wanted to delete a specific point
            // but failed to select it (or you thought it's selected, while it was
            // only in a hover state)
            if (selectedPointsIndices == null) {
                return false;
            }
            // case: deleting all points
            if (selectedPointsIndices.length >= linearElement.points.length) {
                const nextElements = elements.map((el) => {
                    if (el.id === linearElement.id) {
                        return (0, element_4.newElementWith)(el, { isDeleted: true });
                    }
                    return el;
                });
                const nextAppState = handleGroupEditingState(appState, nextElements);
                return {
                    elements: nextElements,
                    appState: {
                        ...nextAppState,
                        selectedLinearElement: null,
                    },
                    captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
                };
            }
            element_3.LinearElementEditor.deletePoints(linearElement, app, selectedPointsIndices);
            return {
                elements,
                appState: {
                    ...appState,
                    selectedLinearElement: {
                        ...appState.selectedLinearElement,
                        selectedPointsIndices: selectedPointsIndices?.[0] > 0
                            ? [selectedPointsIndices[0] - 1]
                            : [0],
                    },
                },
                captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
            };
        }
        let { elements: nextElements, appState: nextAppState } = deleteSelectedElements(elements, appState, app);
        (0, element_2.fixBindingsAfterDeletion)(nextElements, nextElements.filter((el) => el.isDeleted));
        nextAppState = handleGroupEditingState(nextAppState, nextElements);
        return {
            elements: nextElements,
            appState: {
                ...nextAppState,
                activeTool: (0, common_1.updateActiveTool)(appState, {
                    type: app.state.preferredSelectionTool.type,
                }),
                multiElement: null,
                newElement: null,
                activeEmbeddable: null,
                selectedLinearElement: null,
            },
            captureUpdate: (0, scene_1.isSomeElementSelected)((0, element_1.getNonDeletedElements)(elements), appState)
                ? element_9.CaptureUpdateAction.IMMEDIATELY
                : element_9.CaptureUpdateAction.EVENTUALLY,
        };
    },
    keyTest: (event, appState, elements) => (event.key === common_1.KEYS.BACKSPACE || event.key === common_1.KEYS.DELETE) &&
        !event[common_1.KEYS.CTRL_OR_CMD],
    PanelComponent: ({ elements, appState, updateData, app }) => {
        const isMobile = (0, App_1.useStylesPanelMode)() === "mobile";
        return ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", icon: icons_1.TrashIcon, title: (0, i18n_1.t)("labels.delete"), "aria-label": (0, i18n_1.t)("labels.delete"), onClick: () => updateData(null), disabled: !(0, scene_1.isSomeElementSelected)((0, element_1.getNonDeletedElements)(elements), appState), style: {
                ...(isMobile && appState.openPopup !== "compactOtherProperties"
                    ? common_1.MOBILE_ACTION_BUTTON_BG
                    : {}),
            } }));
    },
});
