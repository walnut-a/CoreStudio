"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const math_1 = require("@excalidraw/math");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const DragInput_1 = __importDefault(require("./DragInput"));
const utils_1 = require("./utils");
const handlePositionChange = ({ accumulatedChange, instantChange, originalElements, originalElementsMap, shouldChangeByStepSize, nextValue, property, scene, originalAppState, app, }) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const origElement = originalElements[0];
    const [cx, cy] = [
        origElement.x + origElement.width / 2,
        origElement.y + origElement.height / 2,
    ];
    const [topLeftX, topLeftY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(origElement.x, origElement.y), (0, math_1.pointFrom)(cx, cy), origElement.angle);
    if (originalAppState.croppingElementId === origElement.id) {
        const element = elementsMap.get(origElement.id);
        if (!element || !(0, element_2.isImageElement)(element) || !element.crop) {
            return;
        }
        const crop = element.crop;
        let nextCrop = crop;
        const isFlippedByX = element.scale[0] === -1;
        const isFlippedByY = element.scale[1] === -1;
        const { width: uncroppedWidth, height: uncroppedHeight } = (0, element_1.getUncroppedWidthAndHeight)(element);
        if (nextValue !== undefined) {
            if (property === "x") {
                const nextValueInNatural = nextValue * (crop.naturalWidth / uncroppedWidth);
                if (isFlippedByX) {
                    nextCrop = {
                        ...crop,
                        x: (0, math_1.clamp)(crop.naturalWidth - nextValueInNatural - crop.width, 0, crop.naturalWidth - crop.width),
                    };
                }
                else {
                    nextCrop = {
                        ...crop,
                        x: (0, math_1.clamp)(nextValue * (crop.naturalWidth / uncroppedWidth), 0, crop.naturalWidth - crop.width),
                    };
                }
            }
            if (property === "y") {
                nextCrop = {
                    ...crop,
                    y: (0, math_1.clamp)(nextValue * (crop.naturalHeight / uncroppedHeight), 0, crop.naturalHeight - crop.height),
                };
            }
            scene.mutateElement(element, {
                crop: nextCrop,
            });
            return;
        }
        const changeInX = (property === "x" ? instantChange : 0) * (isFlippedByX ? -1 : 1);
        const changeInY = (property === "y" ? instantChange : 0) * (isFlippedByY ? -1 : 1);
        nextCrop = {
            ...crop,
            x: (0, math_1.clamp)(crop.x + changeInX, 0, crop.naturalWidth - crop.width),
            y: (0, math_1.clamp)(crop.y + changeInY, 0, crop.naturalHeight - crop.height),
        };
        scene.mutateElement(element, {
            crop: nextCrop,
        });
        return;
    }
    if (nextValue !== undefined) {
        const newTopLeftX = property === "x" ? nextValue : topLeftX;
        const newTopLeftY = property === "y" ? nextValue : topLeftY;
        (0, utils_1.moveElement)(newTopLeftX, newTopLeftY, origElement, scene, app.state, originalElementsMap);
        return;
    }
    const changeInTopX = property === "x" ? accumulatedChange : 0;
    const changeInTopY = property === "y" ? accumulatedChange : 0;
    const newTopLeftX = property === "x"
        ? Math.round(shouldChangeByStepSize
            ? (0, utils_1.getStepSizedValue)(origElement.x + changeInTopX, utils_1.STEP_SIZE)
            : topLeftX + changeInTopX)
        : topLeftX;
    const newTopLeftY = property === "y"
        ? Math.round(shouldChangeByStepSize
            ? (0, utils_1.getStepSizedValue)(origElement.y + changeInTopY, utils_1.STEP_SIZE)
            : topLeftY + changeInTopY)
        : topLeftY;
    (0, utils_1.moveElement)(newTopLeftX, newTopLeftY, origElement, scene, app.state, originalElementsMap);
};
const Position = ({ property, element, elementsMap, scene, appState, }) => {
    const [topLeftX, topLeftY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x, element.y), (0, math_1.pointFrom)(element.x + element.width / 2, element.y + element.height / 2), element.angle);
    let value = (0, math_1.round)(property === "x" ? topLeftX : topLeftY, 2);
    if (appState.croppingElementId === element.id &&
        (0, element_2.isImageElement)(element) &&
        element.crop) {
        const flipAdjustedPosition = (0, element_1.getFlipAdjustedCropPosition)(element);
        if (flipAdjustedPosition) {
            value = (0, math_1.round)(property === "x" ? flipAdjustedPosition.x : flipAdjustedPosition.y, 2);
        }
    }
    return ((0, jsx_runtime_1.jsx)(DragInput_1.default, { label: property === "x" ? "X" : "Y", elements: [element], dragInputCallback: handlePositionChange, scene: scene, value: value, property: property, appState: appState }));
};
exports.default = Position;
