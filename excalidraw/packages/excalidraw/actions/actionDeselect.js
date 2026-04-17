"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionDeselect = void 0;
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const register_1 = require("./register");
const getNextActiveTool = (appState, app) => {
    if (appState.activeTool.type === "eraser") {
        return (0, common_1.updateActiveTool)(appState, {
            ...(appState.activeTool.lastActiveTool || {
                type: app.state.preferredSelectionTool.type,
            }),
            lastActiveToolBeforeEraser: null,
        });
    }
    return (0, common_1.updateActiveTool)(appState, {
        type: app.state.preferredSelectionTool.type,
    });
};
const getParentEditingGroupId = (appState, app, selectedElementIds) => {
    if (!appState.editingGroupId) {
        return null;
    }
    const nonDeletedElements = app.scene.getNonDeletedElements();
    const selectedElements = app.scene.getSelectedElements({
        selectedElementIds,
        elements: nonDeletedElements,
    });
    const candidateElements = selectedElements.length
        ? selectedElements
        : (0, element_1.getElementsInGroup)(nonDeletedElements, appState.editingGroupId);
    for (const element of candidateElements) {
        const editingGroupIndex = element.groupIds.indexOf(appState.editingGroupId);
        if (editingGroupIndex !== -1 && element.groupIds[editingGroupIndex + 1]) {
            return element.groupIds[editingGroupIndex + 1];
        }
    }
    return null;
};
exports.actionDeselect = (0, register_1.register)({
    name: "deselect",
    label: "",
    trackEvent: false,
    perform: (_elements, appState, _, app) => {
        const activeTool = getNextActiveTool(appState, app);
        if (appState.editingGroupId) {
            const nonDeletedElements = app.scene.getNonDeletedElements();
            const selectedElementIds = Object.keys(appState.selectedElementIds).length > 0
                ? appState.selectedElementIds
                : (0, element_1.getElementsInGroup)(nonDeletedElements, appState.editingGroupId).reduce((acc, element) => {
                    acc[element.id] = true;
                    return acc;
                }, {});
            return {
                appState: {
                    ...appState,
                    ...(0, element_1.selectGroupsForSelectedElements)({
                        editingGroupId: getParentEditingGroupId(appState, app, selectedElementIds),
                        selectedElementIds,
                    }, nonDeletedElements, appState, app),
                    activeEmbeddable: null,
                    activeTool,
                    selectedLinearElement: null,
                    selectionElement: null,
                    showHyperlinkPopup: false,
                    suggestedBinding: null,
                },
                captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
            };
        }
        return {
            appState: {
                ...appState,
                activeEmbeddable: null,
                activeTool,
                editingGroupId: null,
                selectedElementIds: (0, element_1.makeNextSelectedElementIds)({}, appState),
                selectedGroupIds: {},
                selectedLinearElement: null,
                selectionElement: null,
                showHyperlinkPopup: false,
                suggestedBinding: null,
            },
            captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event, appState, _, app) => {
        if (event.key !== common_1.KEYS.ESCAPE) {
            return false;
        }
        if ((0, common_1.isWritableElement)(event.target)) {
            return false;
        }
        return (!appState.newElement &&
            appState.multiElement === null &&
            !appState.selectedLinearElement?.isEditing &&
            (appState.activeEmbeddable !== null ||
                appState.activeTool.type !== app.state.preferredSelectionTool.type ||
                !!appState.editingGroupId ||
                !!appState.selectedLinearElement ||
                (0, element_1.isSomeElementSelected)(app.scene.getNonDeletedElements(), appState)));
    },
});
