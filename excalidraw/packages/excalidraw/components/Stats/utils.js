"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAtomicUnits = exports.moveElement = exports.newOrigin = exports.getElementsInAtomicUnit = exports.getStepSizedValue = exports.isPropertyEditable = exports.STEP_SIZE = exports.SMALLEST_DELTA = void 0;
const math_1 = require("@excalidraw/math");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
exports.SMALLEST_DELTA = 0.01;
exports.STEP_SIZE = 10;
const isPropertyEditable = (element, property) => {
    if (property === "angle" && (0, element_2.isFrameLikeElement)(element)) {
        return false;
    }
    return true;
};
exports.isPropertyEditable = isPropertyEditable;
const getStepSizedValue = (value, stepSize) => {
    const v = value + stepSize / 2;
    return v - (v % stepSize);
};
exports.getStepSizedValue = getStepSizedValue;
const getElementsInAtomicUnit = (atomicUnit, elementsMap, originalElementsMap) => {
    return Object.keys(atomicUnit)
        .map((id) => ({
        original: (originalElementsMap ?? elementsMap).get(id),
        latest: elementsMap.get(id),
    }))
        .filter((el) => el.original !== undefined && el.latest !== undefined);
};
exports.getElementsInAtomicUnit = getElementsInAtomicUnit;
const newOrigin = (x1, y1, w1, h1, w2, h2, angle) => {
    /**
     * The formula below is the result of solving
     *   rotate(x1, y1, cx1, cy1, angle) = rotate(x2, y2, cx2, cy2, angle)
     * where rotate is the function defined in math.ts
     *
     * This is so that the new origin (x2, y2),
     * when rotated against the new center (cx2, cy2),
     * coincides with (x1, y1) rotated against (cx1, cy1)
     *
     * The reason for doing this computation is so the element's top left corner
     * on the canvas remains fixed after any changes in its dimension.
     */
    return {
        x: x1 +
            (w1 - w2) / 2 +
            ((w2 - w1) / 2) * Math.cos(angle) +
            ((h1 - h2) / 2) * Math.sin(angle),
        y: y1 +
            (h1 - h2) / 2 +
            ((w2 - w1) / 2) * Math.sin(angle) +
            ((h2 - h1) / 2) * Math.cos(angle),
    };
};
exports.newOrigin = newOrigin;
const moveElement = (newTopLeftX, newTopLeftY, originalElement, scene, appState, originalElementsMap, shouldInformMutation = true) => {
    if ((0, element_1.isBindingElement)(originalElement) &&
        (originalElement.startBinding || originalElement.endBinding)) {
        if (Math.abs(newTopLeftX - originalElement.x) < common_1.DRAGGING_THRESHOLD &&
            Math.abs(newTopLeftY - originalElement.y) < common_1.DRAGGING_THRESHOLD) {
            return;
        }
        (0, element_1.unbindBindingElement)(originalElement, "start", scene);
        (0, element_1.unbindBindingElement)(originalElement, "end", scene);
    }
    const elementsMap = scene.getNonDeletedElementsMap();
    const latestElement = elementsMap.get(originalElement.id);
    if (!latestElement) {
        return;
    }
    const [cx, cy] = [
        originalElement.x + originalElement.width / 2,
        originalElement.y + originalElement.height / 2,
    ];
    const [topLeftX, topLeftY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(originalElement.x, originalElement.y), (0, math_1.pointFrom)(cx, cy), originalElement.angle);
    const changeInX = newTopLeftX - topLeftX;
    const changeInY = newTopLeftY - topLeftY;
    const [x, y] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(newTopLeftX, newTopLeftY), (0, math_1.pointFrom)(cx + changeInX, cy + changeInY), -originalElement.angle);
    scene.mutateElement(latestElement, {
        x,
        y,
    }, { informMutation: shouldInformMutation, isDragging: false });
    (0, element_5.updateBindings)(latestElement, scene, appState);
    const boundTextElement = (0, element_1.getBoundTextElement)(originalElement, originalElementsMap);
    if (boundTextElement) {
        const latestBoundTextElement = elementsMap.get(boundTextElement.id);
        latestBoundTextElement &&
            scene.mutateElement(latestBoundTextElement, {
                x: boundTextElement.x + changeInX,
                y: boundTextElement.y + changeInY,
            }, { informMutation: shouldInformMutation, isDragging: false });
    }
    if ((0, element_2.isFrameLikeElement)(originalElement)) {
        const originalChildren = (0, element_4.getFrameChildren)(originalElementsMap, originalElement.id);
        originalChildren.forEach((child) => {
            const latestChildElement = elementsMap.get(child.id);
            if (!latestChildElement) {
                return;
            }
            const [childCX, childCY] = [
                child.x + child.width / 2,
                child.y + child.height / 2,
            ];
            const [childTopLeftX, childTopLeftY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(child.x, child.y), (0, math_1.pointFrom)(childCX, childCY), child.angle);
            const childNewTopLeftX = Math.round(childTopLeftX + changeInX);
            const childNewTopLeftY = Math.round(childTopLeftY + changeInY);
            const [childX, childY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(childNewTopLeftX, childNewTopLeftY), (0, math_1.pointFrom)(childCX + changeInX, childCY + changeInY), -child.angle);
            scene.mutateElement(latestChildElement, {
                x: childX,
                y: childY,
            }, { informMutation: shouldInformMutation, isDragging: false });
            (0, element_5.updateBindings)(latestChildElement, scene, appState, {
                simultaneouslyUpdated: originalChildren,
            });
        });
    }
};
exports.moveElement = moveElement;
const getAtomicUnits = (targetElements, appState) => {
    const selectedGroupIds = (0, element_3.getSelectedGroupIds)(appState);
    const _atomicUnits = selectedGroupIds.map((gid) => {
        return (0, element_3.getElementsInGroup)(targetElements, gid).reduce((acc, el) => {
            acc[el.id] = true;
            return acc;
        }, {});
    });
    targetElements
        .filter((el) => !(0, element_3.isInGroup)(el))
        .forEach((el) => {
        _atomicUnits.push({
            [el.id]: true,
        });
    });
    return _atomicUnits;
};
exports.getAtomicUnits = getAtomicUnits;
