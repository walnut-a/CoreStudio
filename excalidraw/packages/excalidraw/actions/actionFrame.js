"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionWrapSelectionInFrame = exports.actionSetFrameAsActiveTool = exports.actionupdateFrameRendering = exports.actionRemoveAllElementsFromFrame = exports.actionSelectAllElementsInFrame = void 0;
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const element_7 = require("@excalidraw/element");
const element_8 = require("@excalidraw/element");
const element_9 = require("@excalidraw/element");
const cursor_1 = require("../cursor");
const icons_1 = require("../components/icons");
const scene_1 = require("../scene");
const register_1 = require("./register");
const isSingleFrameSelected = (appState, app) => {
    const selectedElements = app.scene.getSelectedElements(appState);
    return (selectedElements.length === 1 && (0, element_4.isFrameLikeElement)(selectedElements[0]));
};
exports.actionSelectAllElementsInFrame = (0, register_1.register)({
    name: "selectAllElementsInFrame",
    label: "labels.selectAllElementsInFrame",
    trackEvent: { category: "canvas" },
    perform: (elements, appState, _, app) => {
        const selectedElement = app.scene.getSelectedElements(appState).at(0) || null;
        if ((0, element_4.isFrameLikeElement)(selectedElement)) {
            const elementsInFrame = (0, element_6.getFrameChildren)((0, element_1.getNonDeletedElements)(elements), selectedElement.id).filter((element) => !(element.type === "text" && element.containerId));
            return {
                elements,
                appState: {
                    ...appState,
                    selectedElementIds: elementsInFrame.reduce((acc, element) => {
                        acc[element.id] = true;
                        return acc;
                    }, {}),
                },
                captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
            };
        }
        return {
            elements,
            appState,
            captureUpdate: element_9.CaptureUpdateAction.EVENTUALLY,
        };
    },
    predicate: (elements, appState, _, app) => isSingleFrameSelected(appState, app),
});
exports.actionRemoveAllElementsFromFrame = (0, register_1.register)({
    name: "removeAllElementsFromFrame",
    label: "labels.removeAllElementsFromFrame",
    trackEvent: { category: "history" },
    perform: (elements, appState, _, app) => {
        const selectedElement = app.scene.getSelectedElements(appState).at(0) || null;
        if ((0, element_4.isFrameLikeElement)(selectedElement)) {
            return {
                elements: (0, element_5.removeAllElementsFromFrame)(elements, selectedElement),
                appState: {
                    ...appState,
                    selectedElementIds: {
                        [selectedElement.id]: true,
                    },
                },
                captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
            };
        }
        return {
            elements,
            appState,
            captureUpdate: element_9.CaptureUpdateAction.EVENTUALLY,
        };
    },
    predicate: (elements, appState, _, app) => isSingleFrameSelected(appState, app),
});
exports.actionupdateFrameRendering = (0, register_1.register)({
    name: "updateFrameRendering",
    label: "labels.updateFrameRendering",
    viewMode: true,
    trackEvent: { category: "canvas" },
    perform: (elements, appState) => {
        return {
            elements,
            appState: {
                ...appState,
                frameRendering: {
                    ...appState.frameRendering,
                    enabled: !appState.frameRendering.enabled,
                },
            },
            captureUpdate: element_9.CaptureUpdateAction.EVENTUALLY,
        };
    },
    checked: (appState) => appState.frameRendering.enabled,
});
exports.actionSetFrameAsActiveTool = (0, register_1.register)({
    name: "setFrameAsActiveTool",
    label: "toolBar.frame",
    trackEvent: { category: "toolbar" },
    icon: icons_1.frameToolIcon,
    viewMode: false,
    perform: (elements, appState, _, app) => {
        const nextActiveTool = (0, common_1.updateActiveTool)(appState, {
            type: "frame",
        });
        (0, cursor_1.setCursorForShape)(app.interactiveCanvas, {
            ...appState,
            activeTool: nextActiveTool,
        });
        return {
            elements,
            appState: {
                ...appState,
                activeTool: (0, common_1.updateActiveTool)(appState, {
                    type: "frame",
                }),
            },
            captureUpdate: element_9.CaptureUpdateAction.EVENTUALLY,
        };
    },
    keyTest: (event) => !event[common_1.KEYS.CTRL_OR_CMD] &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLocaleLowerCase() === common_1.KEYS.F,
});
exports.actionWrapSelectionInFrame = (0, register_1.register)({
    name: "wrapSelectionInFrame",
    label: "labels.wrapSelectionInFrame",
    trackEvent: { category: "element" },
    predicate: (elements, appState, _, app) => {
        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
        return (selectedElements.length > 0 &&
            !selectedElements.some((element) => (0, element_4.isFrameLikeElement)(element)));
    },
    perform: (elements, appState, _, app) => {
        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
        const elementsMap = app.scene.getNonDeletedElementsMap();
        const [x1, y1, x2, y2] = (0, element_8.getCommonBounds)(selectedElements, elementsMap);
        const PADDING = 16;
        const frame = (0, element_3.newFrameElement)({
            x: x1 - PADDING,
            y: y1 - PADDING,
            width: x2 - x1 + PADDING * 2,
            height: y2 - y1 + PADDING * 2,
        });
        // for a selected partial group, we want to remove it from the remainder of the group
        if (appState.editingGroupId) {
            const elementsInGroup = (0, element_7.getElementsInGroup)(selectedElements, appState.editingGroupId);
            for (const elementInGroup of elementsInGroup) {
                const index = elementInGroup.groupIds.indexOf(appState.editingGroupId);
                (0, element_2.mutateElement)(elementInGroup, elementsMap, {
                    groupIds: elementInGroup.groupIds.slice(0, index),
                });
            }
        }
        const nextElements = (0, element_5.addElementsToFrame)([...app.scene.getElementsIncludingDeleted(), frame], selectedElements, frame, appState);
        return {
            elements: nextElements,
            appState: {
                selectedElementIds: { [frame.id]: true },
            },
            captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
        };
    },
});
