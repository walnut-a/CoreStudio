"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionUngroup = exports.actionGroup = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const element_7 = require("@excalidraw/element");
const ToolButton_1 = require("../components/ToolButton");
const icons_1 = require("../components/icons");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const shortcut_1 = require("../shortcut");
const register_1 = require("./register");
const allElementsInSameGroup = (elements) => {
    if (elements.length >= 2) {
        const groupIds = elements[0].groupIds;
        for (const groupId of groupIds) {
            if (elements.reduce((acc, element) => acc && (0, element_5.isElementInGroup)(element, groupId), true)) {
                return true;
            }
        }
    }
    return false;
};
const enableActionGroup = (elements, appState, app) => {
    const selectedElements = app.scene.getSelectedElements({
        selectedElementIds: appState.selectedElementIds,
        includeBoundTextElement: true,
    });
    return (selectedElements.length >= 2 &&
        !allElementsInSameGroup(selectedElements) &&
        !(0, element_4.frameAndChildrenSelectedTogether)(selectedElements));
};
exports.actionGroup = (0, register_1.register)({
    name: "group",
    label: "labels.group",
    icon: (appState) => (0, jsx_runtime_1.jsx)(icons_1.GroupIcon, { theme: appState.theme }),
    trackEvent: { category: "element" },
    perform: (elements, appState, _, app) => {
        const selectedElements = (0, element_4.getRootElements)(app.scene.getSelectedElements({
            selectedElementIds: appState.selectedElementIds,
            includeBoundTextElement: true,
        }));
        if (selectedElements.length < 2) {
            // nothing to group
            return {
                appState,
                elements,
                captureUpdate: element_7.CaptureUpdateAction.EVENTUALLY,
            };
        }
        // if everything is already grouped into 1 group, there is nothing to do
        const selectedGroupIds = (0, element_5.getSelectedGroupIds)(appState);
        if (selectedGroupIds.length === 1) {
            const selectedGroupId = selectedGroupIds[0];
            const elementIdsInGroup = new Set((0, element_5.getElementsInGroup)(elements, selectedGroupId).map((element) => element.id));
            const selectedElementIds = new Set(selectedElements.map((element) => element.id));
            const combinedSet = new Set([
                ...Array.from(elementIdsInGroup),
                ...Array.from(selectedElementIds),
            ]);
            if (combinedSet.size === elementIdsInGroup.size) {
                // no incremental ids in the selected ids
                return {
                    appState,
                    elements,
                    captureUpdate: element_7.CaptureUpdateAction.EVENTUALLY,
                };
            }
        }
        let nextElements = [...elements];
        // this includes the case where we are grouping elements inside a frame
        // and elements outside that frame
        const groupingElementsFromDifferentFrames = new Set(selectedElements.map((element) => element.frameId)).size > 1;
        // when it happens, we want to remove elements that are in the frame
        // and are going to be grouped from the frame (mouthful, I know)
        if (groupingElementsFromDifferentFrames) {
            const frameElementsMap = (0, element_4.groupByFrameLikes)(selectedElements);
            frameElementsMap.forEach((elementsInFrame, frameId) => {
                (0, element_4.removeElementsFromFrame)(elementsInFrame, app.scene.getNonDeletedElementsMap());
            });
        }
        const newGroupId = (0, common_1.randomId)();
        const selectElementIds = (0, common_1.arrayToMap)(selectedElements);
        nextElements = nextElements.map((element) => {
            if (!selectElementIds.get(element.id)) {
                return element;
            }
            return (0, element_2.newElementWith)(element, {
                groupIds: (0, element_5.addToGroup)(element.groupIds, newGroupId, appState.editingGroupId),
            });
        });
        // keep the z order within the group the same, but move them
        // to the z order of the highest element in the layer stack
        const elementsInGroup = (0, element_5.getElementsInGroup)(nextElements, newGroupId);
        const lastElementInGroup = elementsInGroup[elementsInGroup.length - 1];
        const lastGroupElementIndex = nextElements.lastIndexOf(lastElementInGroup);
        const elementsAfterGroup = nextElements.slice(lastGroupElementIndex + 1);
        const elementsBeforeGroup = nextElements
            .slice(0, lastGroupElementIndex)
            .filter((updatedElement) => !(0, element_5.isElementInGroup)(updatedElement, newGroupId));
        const reorderedElements = (0, element_6.syncMovedIndices)([...elementsBeforeGroup, ...elementsInGroup, ...elementsAfterGroup], (0, common_1.arrayToMap)(elementsInGroup));
        return {
            appState: {
                ...appState,
                ...(0, element_5.selectGroup)(newGroupId, { ...appState, selectedGroupIds: {} }, (0, element_1.getNonDeletedElements)(nextElements)),
            },
            elements: reorderedElements,
            captureUpdate: element_7.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    predicate: (elements, appState, _, app) => enableActionGroup(elements, appState, app),
    keyTest: (event) => !event.shiftKey && event[common_1.KEYS.CTRL_OR_CMD] && event.key === common_1.KEYS.G,
    PanelComponent: ({ elements, appState, updateData, app }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { hidden: !enableActionGroup(elements, appState, app), type: "button", icon: (0, jsx_runtime_1.jsx)(icons_1.GroupIcon, { theme: appState.theme }), onClick: () => updateData(null), title: `${(0, i18n_1.t)("labels.group")} — ${(0, shortcut_1.getShortcutKey)("CtrlOrCmd+G")}`, "aria-label": (0, i18n_1.t)("labels.group"), visible: (0, scene_1.isSomeElementSelected)((0, element_1.getNonDeletedElements)(elements), appState) })),
});
exports.actionUngroup = (0, register_1.register)({
    name: "ungroup",
    label: "labels.ungroup",
    icon: (appState) => (0, jsx_runtime_1.jsx)(icons_1.UngroupIcon, { theme: appState.theme }),
    trackEvent: { category: "element" },
    perform: (elements, appState, _, app) => {
        const groupIds = (0, element_5.getSelectedGroupIds)(appState);
        const elementsMap = (0, common_1.arrayToMap)(elements);
        if (groupIds.length === 0) {
            return {
                appState,
                elements,
                captureUpdate: element_7.CaptureUpdateAction.EVENTUALLY,
            };
        }
        let nextElements = [...elements];
        const boundTextElementIds = [];
        nextElements = nextElements.map((element) => {
            if ((0, element_3.isBoundToContainer)(element)) {
                boundTextElementIds.push(element.id);
            }
            const nextGroupIds = (0, element_5.removeFromSelectedGroups)(element.groupIds, appState.selectedGroupIds);
            if (nextGroupIds.length === element.groupIds.length) {
                return element;
            }
            return (0, element_2.newElementWith)(element, {
                groupIds: nextGroupIds,
            });
        });
        const updateAppState = (0, element_5.selectGroupsForSelectedElements)(appState, (0, element_1.getNonDeletedElements)(nextElements), appState, null);
        const selectedElements = app.scene.getSelectedElements(appState);
        const selectedElementFrameIds = new Set(selectedElements
            .filter((element) => element.frameId)
            .map((element) => element.frameId));
        const targetFrames = (0, element_4.getFrameLikeElements)(elements).filter((frame) => selectedElementFrameIds.has(frame.id));
        targetFrames.forEach((frame) => {
            if (frame) {
                nextElements = (0, element_4.replaceAllElementsInFrame)(nextElements, (0, element_4.getElementsInResizingFrame)(nextElements, frame, appState, elementsMap), frame, app);
            }
        });
        // remove binded text elements from selection
        updateAppState.selectedElementIds = Object.entries(updateAppState.selectedElementIds).reduce((acc, [id, selected]) => {
            if (selected && !boundTextElementIds.includes(id)) {
                acc[id] = true;
            }
            return acc;
        }, {});
        return {
            appState: { ...appState, ...updateAppState },
            elements: nextElements,
            captureUpdate: element_7.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => event.shiftKey &&
        event[common_1.KEYS.CTRL_OR_CMD] &&
        event.key === common_1.KEYS.G.toUpperCase(),
    predicate: (elements, appState) => (0, element_5.getSelectedGroupIds)(appState).length > 0,
    PanelComponent: ({ elements, appState, updateData }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", hidden: (0, element_5.getSelectedGroupIds)(appState).length === 0, icon: (0, jsx_runtime_1.jsx)(icons_1.UngroupIcon, { theme: appState.theme }), onClick: () => updateData(null), title: `${(0, i18n_1.t)("labels.ungroup")} — ${(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+G")}`, "aria-label": (0, i18n_1.t)("labels.ungroup"), visible: (0, scene_1.isSomeElementSelected)((0, element_1.getNonDeletedElements)(elements), appState) })),
});
