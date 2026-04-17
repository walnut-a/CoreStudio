"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const math_1 = require("@excalidraw/math");
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const utils_1 = require("@excalidraw/utils");
const DragInput_1 = __importDefault(require("./DragInput"));
const utils_2 = require("./utils");
const utils_3 = require("./utils");
const STEP_SIZE = 10;
const getResizedUpdates = (anchorX, anchorY, scale, origElement) => {
    const offsetX = origElement.x - anchorX;
    const offsetY = origElement.y - anchorY;
    const nextWidth = origElement.width * scale;
    const nextHeight = origElement.height * scale;
    const x = anchorX + offsetX * scale;
    const y = anchorY + offsetY * scale;
    return {
        width: nextWidth,
        height: nextHeight,
        x,
        y,
        ...(0, element_2.rescalePointsInElement)(origElement, nextWidth, nextHeight, false),
        ...((0, element_4.isTextElement)(origElement)
            ? { fontSize: origElement.fontSize * scale }
            : {}),
    };
};
const resizeElementInGroup = (anchorX, anchorY, property, scale, latestElement, origElement, originalElementsMap, scene) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const updates = getResizedUpdates(anchorX, anchorY, scale, origElement);
    scene.mutateElement(latestElement, updates);
    const boundTextElement = (0, element_3.getBoundTextElement)(origElement, originalElementsMap);
    if (boundTextElement) {
        const newFontSize = boundTextElement.fontSize * scale;
        (0, element_1.updateBoundElements)(latestElement, scene);
        const latestBoundTextElement = elementsMap.get(boundTextElement.id);
        if (latestBoundTextElement && (0, element_4.isTextElement)(latestBoundTextElement)) {
            scene.mutateElement(latestBoundTextElement, {
                fontSize: newFontSize,
            });
            (0, element_3.handleBindTextResize)(latestElement, scene, property === "width" ? "e" : "s", true);
        }
    }
};
const resizeGroup = (nextWidth, nextHeight, initialHeight, aspectRatio, anchor, property, latestElements, originalElements, originalElementsMap, scene) => {
    // keep aspect ratio for groups
    if (property === "width") {
        nextHeight = Math.round((nextWidth / aspectRatio) * 100) / 100;
    }
    else {
        nextWidth = Math.round(nextHeight * aspectRatio * 100) / 100;
    }
    const scale = nextHeight / initialHeight;
    for (let i = 0; i < originalElements.length; i++) {
        const origElement = originalElements[i];
        const latestElement = latestElements[i];
        resizeElementInGroup(anchor[0], anchor[1], property, scale, latestElement, origElement, originalElementsMap, scene);
    }
};
const handleDimensionChange = ({ accumulatedChange, originalElements, originalElementsMap, originalAppState, shouldChangeByStepSize, nextValue, scene, property, setAppState, app, }) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const atomicUnits = (0, utils_2.getAtomicUnits)(originalElements, originalAppState);
    if (nextValue !== undefined) {
        for (const atomicUnit of atomicUnits) {
            const elementsInUnit = (0, utils_3.getElementsInAtomicUnit)(atomicUnit, elementsMap, originalElementsMap);
            if (elementsInUnit.length > 1) {
                const latestElements = elementsInUnit.map((el) => el.latest);
                const originalElements = elementsInUnit.map((el) => el.original);
                const [x1, y1, x2, y2] = (0, utils_1.getCommonBounds)(originalElements);
                const initialWidth = x2 - x1;
                const initialHeight = y2 - y1;
                const aspectRatio = initialWidth / initialHeight;
                const nextWidth = Math.max(common_1.MIN_WIDTH_OR_HEIGHT, property === "width" ? Math.max(0, nextValue) : initialWidth);
                const nextHeight = Math.max(common_1.MIN_WIDTH_OR_HEIGHT, property === "height" ? Math.max(0, nextValue) : initialHeight);
                resizeGroup(nextWidth, nextHeight, initialHeight, aspectRatio, (0, math_1.pointFrom)(x1, y1), property, latestElements, originalElements, originalElementsMap, scene);
            }
            else {
                const [el] = elementsInUnit;
                const latestElement = el?.latest;
                const origElement = el?.original;
                if (latestElement &&
                    origElement &&
                    (0, utils_2.isPropertyEditable)(latestElement, property)) {
                    let nextWidth = property === "width" ? Math.max(0, nextValue) : latestElement.width;
                    if (property === "width") {
                        if (shouldChangeByStepSize) {
                            nextWidth = (0, utils_2.getStepSizedValue)(nextWidth, STEP_SIZE);
                        }
                        else {
                            nextWidth = Math.round(nextWidth);
                        }
                    }
                    let nextHeight = property === "height"
                        ? Math.max(0, nextValue)
                        : latestElement.height;
                    if (property === "height") {
                        if (shouldChangeByStepSize) {
                            nextHeight = (0, utils_2.getStepSizedValue)(nextHeight, STEP_SIZE);
                        }
                        else {
                            nextHeight = Math.round(nextHeight);
                        }
                    }
                    nextWidth = Math.max(common_1.MIN_WIDTH_OR_HEIGHT, nextWidth);
                    nextHeight = Math.max(common_1.MIN_WIDTH_OR_HEIGHT, nextHeight);
                    (0, element_2.resizeSingleElement)(nextWidth, nextHeight, latestElement, origElement, originalElementsMap, scene, property === "width" ? "e" : "s", {
                        shouldInformMutation: false,
                    });
                    // Handle frame membership update for resized frames
                    if ((0, element_1.isFrameLikeElement)(latestElement)) {
                        const nextElementsInFrame = (0, element_1.getElementsInResizingFrame)(scene.getElementsIncludingDeleted(), latestElement, originalAppState, scene.getNonDeletedElementsMap());
                        const updatedElements = (0, element_1.replaceAllElementsInFrame)(scene.getElementsIncludingDeleted(), nextElementsInFrame, latestElement, app);
                        scene.replaceAllElements(updatedElements);
                    }
                }
            }
        }
        scene.triggerUpdate();
        return;
    }
    const changeInWidth = property === "width" ? accumulatedChange : 0;
    const changeInHeight = property === "height" ? accumulatedChange : 0;
    const elementsToHighlight = [];
    for (const atomicUnit of atomicUnits) {
        const elementsInUnit = (0, utils_3.getElementsInAtomicUnit)(atomicUnit, elementsMap, originalElementsMap);
        if (elementsInUnit.length > 1) {
            const latestElements = elementsInUnit.map((el) => el.latest);
            const originalElements = elementsInUnit.map((el) => el.original);
            const [x1, y1, x2, y2] = (0, utils_1.getCommonBounds)(originalElements);
            const initialWidth = x2 - x1;
            const initialHeight = y2 - y1;
            const aspectRatio = initialWidth / initialHeight;
            let nextWidth = Math.max(0, initialWidth + changeInWidth);
            if (property === "width") {
                if (shouldChangeByStepSize) {
                    nextWidth = (0, utils_2.getStepSizedValue)(nextWidth, STEP_SIZE);
                }
                else {
                    nextWidth = Math.round(nextWidth);
                }
            }
            let nextHeight = Math.max(0, initialHeight + changeInHeight);
            if (property === "height") {
                if (shouldChangeByStepSize) {
                    nextHeight = (0, utils_2.getStepSizedValue)(nextHeight, STEP_SIZE);
                }
                else {
                    nextHeight = Math.round(nextHeight);
                }
            }
            nextWidth = Math.max(common_1.MIN_WIDTH_OR_HEIGHT, nextWidth);
            nextHeight = Math.max(common_1.MIN_WIDTH_OR_HEIGHT, nextHeight);
            resizeGroup(nextWidth, nextHeight, initialHeight, aspectRatio, (0, math_1.pointFrom)(x1, y1), property, latestElements, originalElements, originalElementsMap, scene);
        }
        else {
            const [el] = elementsInUnit;
            const latestElement = el?.latest;
            const origElement = el?.original;
            if (latestElement &&
                origElement &&
                (0, utils_2.isPropertyEditable)(latestElement, property)) {
                let nextWidth = Math.max(0, origElement.width + changeInWidth);
                if (property === "width") {
                    if (shouldChangeByStepSize) {
                        nextWidth = (0, utils_2.getStepSizedValue)(nextWidth, STEP_SIZE);
                    }
                    else {
                        nextWidth = Math.round(nextWidth);
                    }
                }
                let nextHeight = Math.max(0, origElement.height + changeInHeight);
                if (property === "height") {
                    if (shouldChangeByStepSize) {
                        nextHeight = (0, utils_2.getStepSizedValue)(nextHeight, STEP_SIZE);
                    }
                    else {
                        nextHeight = Math.round(nextHeight);
                    }
                }
                nextWidth = Math.max(common_1.MIN_WIDTH_OR_HEIGHT, nextWidth);
                nextHeight = Math.max(common_1.MIN_WIDTH_OR_HEIGHT, nextHeight);
                (0, element_2.resizeSingleElement)(nextWidth, nextHeight, latestElement, origElement, originalElementsMap, scene, property === "width" ? "e" : "s", {
                    shouldInformMutation: false,
                });
                // Handle highlighting frame element candidates
                if ((0, element_1.isFrameLikeElement)(latestElement)) {
                    const nextElementsInFrame = (0, element_1.getElementsInResizingFrame)(scene.getElementsIncludingDeleted(), latestElement, originalAppState, scene.getNonDeletedElementsMap());
                    elementsToHighlight.push(...nextElementsInFrame);
                }
            }
        }
    }
    setAppState({
        elementsToHighlight,
    });
    scene.triggerUpdate();
};
const handleDragFinished = ({ setAppState, app, originalElements, originalAppState, }) => {
    const elementsMap = app.scene.getNonDeletedElementsMap();
    const origElement = originalElements?.[0];
    const latestElement = origElement && elementsMap.get(origElement.id);
    // Handle frame membership update for resized frames
    if (latestElement && (0, element_1.isFrameLikeElement)(latestElement)) {
        const nextElementsInFrame = (0, element_1.getElementsInResizingFrame)(app.scene.getElementsIncludingDeleted(), latestElement, originalAppState, app.scene.getNonDeletedElementsMap());
        const updatedElements = (0, element_1.replaceAllElementsInFrame)(app.scene.getElementsIncludingDeleted(), nextElementsInFrame, latestElement, app);
        app.scene.replaceAllElements(updatedElements);
        setAppState({
            elementsToHighlight: null,
        });
    }
};
const MultiDimension = ({ property, elements, elementsMap, atomicUnits, scene, appState, }) => {
    const sizes = (0, react_1.useMemo)(() => atomicUnits.map((atomicUnit) => {
        const elementsInUnit = (0, utils_3.getElementsInAtomicUnit)(atomicUnit, elementsMap);
        if (elementsInUnit.length > 1) {
            const [x1, y1, x2, y2] = (0, utils_1.getCommonBounds)(elementsInUnit.map((el) => el.latest));
            return (Math.round((property === "width" ? x2 - x1 : y2 - y1) * 100) / 100);
        }
        const [el] = elementsInUnit;
        return (Math.round((property === "width" ? el.latest.width : el.latest.height) * 100) / 100);
    }), [elementsMap, atomicUnits, property]);
    const value = new Set(sizes).size === 1 ? Math.round(sizes[0] * 100) / 100 : "Mixed";
    const editable = sizes.length > 0;
    return ((0, jsx_runtime_1.jsx)(DragInput_1.default, { label: property === "width" ? "W" : "H", elements: elements, dragInputCallback: handleDimensionChange, value: value, editable: editable, appState: appState, property: property, scene: scene, dragFinishedCallback: handleDragFinished }));
};
exports.default = MultiDimension;
