"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionFlipVertical = exports.actionFlipHorizontal = void 0;
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const element_7 = require("@excalidraw/element");
const element_8 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const element_9 = require("@excalidraw/element");
const scene_1 = require("../scene");
const icons_1 = require("../components/icons");
const register_1 = require("./register");
exports.actionFlipHorizontal = (0, register_1.register)({
    name: "flipHorizontal",
    label: "labels.flipHorizontal",
    icon: icons_1.flipHorizontal,
    trackEvent: { category: "element" },
    perform: (elements, appState, _, app) => {
        return {
            elements: (0, element_8.updateFrameMembershipOfSelectedElements)(flipSelectedElements(elements, app.scene.getNonDeletedElementsMap(), appState, "horizontal", app), appState, app),
            appState,
            captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => event.shiftKey && event.code === common_1.CODES.H,
});
exports.actionFlipVertical = (0, register_1.register)({
    name: "flipVertical",
    label: "labels.flipVertical",
    icon: icons_1.flipVertical,
    trackEvent: { category: "element" },
    perform: (elements, appState, _, app) => {
        return {
            elements: (0, element_8.updateFrameMembershipOfSelectedElements)(flipSelectedElements(elements, app.scene.getNonDeletedElementsMap(), appState, "vertical", app), appState, app),
            appState,
            captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => event.shiftKey && event.code === common_1.CODES.V && !event[common_1.KEYS.CTRL_OR_CMD],
});
const flipSelectedElements = (elements, elementsMap, appState, flipDirection, app) => {
    const selectedElements = (0, scene_1.getSelectedElements)((0, element_1.getNonDeletedElements)(elements), appState, {
        includeBoundTextElement: true,
        includeElementsInFrames: true,
    });
    const updatedElements = flipElements(selectedElements, elementsMap, flipDirection, app);
    const updatedElementsMap = (0, common_1.arrayToMap)(updatedElements);
    return elements.map((element) => updatedElementsMap.get(element.id) || element);
};
const flipElements = (selectedElements, elementsMap, flipDirection, app) => {
    if (selectedElements.every((element) => (0, element_7.isArrowElement)(element) && (element.startBinding || element.endBinding))) {
        return selectedElements.map((element) => {
            const _element = element;
            return (0, element_4.newElementWith)(_element, {
                startArrowhead: _element.endArrowhead,
                endArrowhead: _element.startArrowhead,
            });
        });
    }
    const { midX, midY } = (0, element_3.getCommonBoundingBox)(selectedElements);
    (0, element_6.resizeMultipleElements)(selectedElements, elementsMap, "nw", app.scene, new Map(Array.from(elementsMap.values()).map((element) => [
        element.id,
        (0, element_5.deepCopyElement)(element),
    ])), {
        flipByX: flipDirection === "horizontal",
        flipByY: flipDirection === "vertical",
        shouldResizeFromCenter: true,
        shouldMaintainAspectRatio: true,
    });
    (0, element_2.bindOrUnbindBindingElements)(selectedElements.filter(element_7.isArrowElement), app.scene, app.state);
    // ---------------------------------------------------------------------------
    // flipping arrow elements (and potentially other) makes the selection group
    // "move" across the canvas because of how arrows can bump against the "wall"
    // of the selection, so we need to center the group back to the original
    // position so that repeated flips don't accumulate the offset
    const { elbowArrows, otherElements } = selectedElements.reduce((acc, element) => (0, element_7.isElbowArrow)(element)
        ? { ...acc, elbowArrows: acc.elbowArrows.concat(element) }
        : { ...acc, otherElements: acc.otherElements.concat(element) }, { elbowArrows: [], otherElements: [] });
    const { midX: newMidX, midY: newMidY } = (0, element_3.getCommonBoundingBox)(selectedElements);
    const [diffX, diffY] = [midX - newMidX, midY - newMidY];
    otherElements.forEach((element) => app.scene.mutateElement(element, {
        x: element.x + diffX,
        y: element.y + diffY,
    }));
    elbowArrows.forEach((element) => app.scene.mutateElement(element, {
        x: element.x + diffX,
        y: element.y + diffY,
    }));
    // ---------------------------------------------------------------------------
    return selectedElements;
};
