"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const DragInput_1 = __importDefault(require("./DragInput"));
const utils_1 = require("./utils");
const STEP_SIZE = 10;
const _shouldKeepAspectRatio = (element) => {
    return element.type === "image";
};
const handleDimensionChange = ({ accumulatedChange, originalElements, originalElementsMap, shouldKeepAspectRatio, shouldChangeByStepSize, nextValue, property, originalAppState, instantChange, scene, app, setAppState, }) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const origElement = originalElements[0];
    const latestElement = elementsMap.get(origElement.id);
    if (origElement && latestElement) {
        const keepAspectRatio = shouldKeepAspectRatio || _shouldKeepAspectRatio(origElement);
        const aspectRatio = origElement.width / origElement.height;
        if (originalAppState.croppingElementId === origElement.id) {
            const element = elementsMap.get(origElement.id);
            if (!element || !(0, element_3.isImageElement)(element) || !element.crop) {
                return;
            }
            const crop = element.crop;
            let nextCrop = { ...crop };
            const isFlippedByX = element.scale[0] === -1;
            const isFlippedByY = element.scale[1] === -1;
            const { width: uncroppedWidth, height: uncroppedHeight } = (0, element_1.getUncroppedWidthAndHeight)(element);
            const naturalToUncroppedWidthRatio = crop.naturalWidth / uncroppedWidth;
            const naturalToUncroppedHeightRatio = crop.naturalHeight / uncroppedHeight;
            const MAX_POSSIBLE_WIDTH = isFlippedByX
                ? crop.width + crop.x
                : crop.naturalWidth - crop.x;
            const MAX_POSSIBLE_HEIGHT = isFlippedByY
                ? crop.height + crop.y
                : crop.naturalHeight - crop.y;
            const MIN_WIDTH = element_1.MINIMAL_CROP_SIZE * naturalToUncroppedWidthRatio;
            const MIN_HEIGHT = element_1.MINIMAL_CROP_SIZE * naturalToUncroppedHeightRatio;
            if (nextValue !== undefined) {
                if (property === "width") {
                    const nextValueInNatural = nextValue * naturalToUncroppedWidthRatio;
                    const nextCropWidth = (0, math_1.clamp)(nextValueInNatural, MIN_WIDTH, MAX_POSSIBLE_WIDTH);
                    nextCrop = {
                        ...nextCrop,
                        width: nextCropWidth,
                        x: isFlippedByX ? crop.x + crop.width - nextCropWidth : crop.x,
                    };
                }
                else if (property === "height") {
                    const nextValueInNatural = nextValue * naturalToUncroppedHeightRatio;
                    const nextCropHeight = (0, math_1.clamp)(nextValueInNatural, MIN_HEIGHT, MAX_POSSIBLE_HEIGHT);
                    nextCrop = {
                        ...nextCrop,
                        height: nextCropHeight,
                        y: isFlippedByY ? crop.y + crop.height - nextCropHeight : crop.y,
                    };
                }
                scene.mutateElement(element, {
                    crop: nextCrop,
                    width: nextCrop.width / (crop.naturalWidth / uncroppedWidth),
                    height: nextCrop.height / (crop.naturalHeight / uncroppedHeight),
                });
                return;
            }
            const changeInWidth = property === "width" ? instantChange : 0;
            const changeInHeight = property === "height" ? instantChange : 0;
            const nextCropWidth = (0, math_1.clamp)(crop.width + changeInWidth, MIN_WIDTH, MAX_POSSIBLE_WIDTH);
            const nextCropHeight = (0, math_1.clamp)(crop.height + changeInHeight, MIN_WIDTH, MAX_POSSIBLE_HEIGHT);
            nextCrop = {
                ...crop,
                x: isFlippedByX ? crop.x + crop.width - nextCropWidth : crop.x,
                y: isFlippedByY ? crop.y + crop.height - nextCropHeight : crop.y,
                width: nextCropWidth,
                height: nextCropHeight,
            };
            scene.mutateElement(element, {
                crop: nextCrop,
                width: nextCrop.width / (crop.naturalWidth / uncroppedWidth),
                height: nextCrop.height / (crop.naturalHeight / uncroppedHeight),
            });
            return;
        }
        // User types in a value to stats then presses Enter
        if (nextValue !== undefined) {
            const nextWidth = Math.max(property === "width"
                ? nextValue
                : keepAspectRatio
                    ? nextValue * aspectRatio
                    : origElement.width, common_1.MIN_WIDTH_OR_HEIGHT);
            const nextHeight = Math.max(property === "height"
                ? nextValue
                : keepAspectRatio
                    ? nextValue / aspectRatio
                    : origElement.height, common_1.MIN_WIDTH_OR_HEIGHT);
            (0, element_2.resizeSingleElement)(nextWidth, nextHeight, latestElement, origElement, originalElementsMap, scene, property === "width" ? "e" : "s", {
                shouldMaintainAspectRatio: keepAspectRatio,
            });
            // Handle frame membership update for resized frames
            if ((0, element_4.isFrameLikeElement)(latestElement)) {
                const nextElementsInFrame = (0, element_5.getElementsInResizingFrame)(scene.getElementsIncludingDeleted(), latestElement, originalAppState, scene.getNonDeletedElementsMap());
                const updatedElements = (0, element_6.replaceAllElementsInFrame)(scene.getElementsIncludingDeleted(), nextElementsInFrame, latestElement, app);
                scene.replaceAllElements(updatedElements);
            }
            return;
        }
        // Stats slider is dragged
        {
            const changeInWidth = property === "width" ? accumulatedChange : 0;
            const changeInHeight = property === "height" ? accumulatedChange : 0;
            let nextWidth = Math.max(0, origElement.width + changeInWidth);
            if (property === "width") {
                if (shouldChangeByStepSize) {
                    nextWidth = (0, utils_1.getStepSizedValue)(nextWidth, STEP_SIZE);
                }
                else {
                    nextWidth = Math.round(nextWidth);
                }
            }
            let nextHeight = Math.max(0, origElement.height + changeInHeight);
            if (property === "height") {
                if (shouldChangeByStepSize) {
                    nextHeight = (0, utils_1.getStepSizedValue)(nextHeight, STEP_SIZE);
                }
                else {
                    nextHeight = Math.round(nextHeight);
                }
            }
            if (keepAspectRatio) {
                if (property === "width") {
                    nextHeight = Math.round((nextWidth / aspectRatio) * 100) / 100;
                }
                else {
                    nextWidth = Math.round(nextHeight * aspectRatio * 100) / 100;
                }
            }
            nextHeight = Math.max(common_1.MIN_WIDTH_OR_HEIGHT, nextHeight);
            nextWidth = Math.max(common_1.MIN_WIDTH_OR_HEIGHT, nextWidth);
            (0, element_2.resizeSingleElement)(nextWidth, nextHeight, latestElement, origElement, originalElementsMap, scene, property === "width" ? "e" : "s", {
                shouldMaintainAspectRatio: keepAspectRatio,
            });
            // Handle highlighting frame element candidates
            if ((0, element_4.isFrameLikeElement)(latestElement)) {
                const nextElementsInFrame = (0, element_5.getElementsInResizingFrame)(scene.getElementsIncludingDeleted(), latestElement, originalAppState, scene.getNonDeletedElementsMap());
                setAppState({
                    elementsToHighlight: nextElementsInFrame,
                });
            }
        }
    }
};
const handleDragFinished = ({ setAppState, app, originalElements, originalAppState, }) => {
    const elementsMap = app.scene.getNonDeletedElementsMap();
    const origElement = originalElements?.[0];
    const latestElement = origElement && elementsMap.get(origElement.id);
    // Handle frame membership update for resized frames
    if (latestElement && (0, element_4.isFrameLikeElement)(latestElement)) {
        const nextElementsInFrame = (0, element_5.getElementsInResizingFrame)(app.scene.getElementsIncludingDeleted(), latestElement, originalAppState, app.scene.getNonDeletedElementsMap());
        const updatedElements = (0, element_6.replaceAllElementsInFrame)(app.scene.getElementsIncludingDeleted(), nextElementsInFrame, latestElement, app);
        app.scene.replaceAllElements(updatedElements);
        setAppState({
            elementsToHighlight: null,
        });
    }
};
const DimensionDragInput = ({ property, element, scene, appState, }) => {
    let value = (0, math_1.round)(property === "width" ? element.width : element.height, 2);
    if (appState.croppingElementId &&
        appState.croppingElementId === element.id &&
        (0, element_3.isImageElement)(element) &&
        element.crop) {
        const { width: uncroppedWidth, height: uncroppedHeight } = (0, element_1.getUncroppedWidthAndHeight)(element);
        if (property === "width") {
            const ratio = uncroppedWidth / element.crop.naturalWidth;
            value = (0, math_1.round)(element.crop.width * ratio, 2);
        }
        if (property === "height") {
            const ratio = uncroppedHeight / element.crop.naturalHeight;
            value = (0, math_1.round)(element.crop.height * ratio, 2);
        }
    }
    return ((0, jsx_runtime_1.jsx)(DragInput_1.default, { label: property === "width" ? "W" : "H", elements: [element], dragInputCallback: handleDimensionChange, value: value, editable: (0, utils_1.isPropertyEditable)(element, property), scene: scene, appState: appState, property: property, dragFinishedCallback: handleDragFinished }));
};
exports.default = DimensionDragInput;
