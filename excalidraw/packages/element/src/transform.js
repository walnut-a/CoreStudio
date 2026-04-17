"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToExcalidrawElements = void 0;
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const binding_1 = require("./binding");
const newElement_1 = require("./newElement");
const textMeasurements_1 = require("./textMeasurements");
const typeChecks_1 = require("./typeChecks");
const fractionalIndex_1 = require("./fractionalIndex");
const textElement_1 = require("./textElement");
const linearElementEditor_1 = require("./linearElementEditor");
const bounds_1 = require("./bounds");
const Scene_1 = require("./Scene");
const DEFAULT_LINEAR_ELEMENT_PROPS = {
    width: 100,
    height: 0,
};
const DEFAULT_DIMENSION = 100;
const bindTextToContainer = (container, textProps, scene) => {
    const textElement = (0, newElement_1.newTextElement)({
        x: 0,
        y: 0,
        textAlign: common_1.TEXT_ALIGN.CENTER,
        verticalAlign: common_1.VERTICAL_ALIGN.MIDDLE,
        ...textProps,
        containerId: container.id,
        strokeColor: textProps.strokeColor || container.strokeColor,
    });
    Object.assign(container, {
        boundElements: (container.boundElements || []).concat({
            type: "text",
            id: textElement.id,
        }),
    });
    (0, textElement_1.redrawTextBoundingBox)(textElement, container, scene);
    return [container, textElement];
};
const bindLinearElementToElement = (linearElement, start, end, elementStore, scene) => {
    let startBoundElement;
    let endBoundElement;
    Object.assign(linearElement, {
        startBinding: linearElement?.startBinding || null,
        endBinding: linearElement.endBinding || null,
    });
    if (start) {
        const width = start?.width ?? DEFAULT_DIMENSION;
        const height = start?.height ?? DEFAULT_DIMENSION;
        let existingElement;
        if (start.id) {
            existingElement = elementStore.getElement(start.id);
            if (!existingElement) {
                console.error(`No element for start binding with id ${start.id} found`);
            }
        }
        const startX = start.x || linearElement.x - width;
        const startY = start.y || linearElement.y - height / 2;
        const startType = existingElement ? existingElement.type : start.type;
        if (startType) {
            if (startType === "text") {
                let text = "";
                if (existingElement && existingElement.type === "text") {
                    text = existingElement.text;
                }
                else if (start.type === "text") {
                    text = start.text;
                }
                if (!text) {
                    console.error(`No text found for start binding text element for ${linearElement.id}`);
                }
                startBoundElement = (0, newElement_1.newTextElement)({
                    x: startX,
                    y: startY,
                    type: "text",
                    ...existingElement,
                    ...start,
                    text,
                });
                // to position the text correctly when coordinates not provided
                Object.assign(startBoundElement, {
                    x: start.x || linearElement.x - startBoundElement.width,
                    y: start.y || linearElement.y - startBoundElement.height / 2,
                });
            }
            else {
                switch (startType) {
                    case "rectangle":
                    case "ellipse":
                    case "diamond": {
                        startBoundElement = (0, newElement_1.newElement)({
                            x: startX,
                            y: startY,
                            width,
                            height,
                            ...existingElement,
                            ...start,
                            type: startType,
                        });
                        break;
                    }
                    default: {
                        (0, common_1.assertNever)(linearElement, `Unhandled element start type "${start.type}"`, true);
                    }
                }
            }
            (0, binding_1.bindBindingElement)(linearElement, startBoundElement, "orbit", "start", scene);
        }
    }
    if (end) {
        const height = end?.height ?? DEFAULT_DIMENSION;
        const width = end?.width ?? DEFAULT_DIMENSION;
        let existingElement;
        if (end.id) {
            existingElement = elementStore.getElement(end.id);
            if (!existingElement) {
                console.error(`No element for end binding with id ${end.id} found`);
            }
        }
        const endX = end.x || linearElement.x + linearElement.width;
        const endY = end.y || linearElement.y - height / 2;
        const endType = existingElement ? existingElement.type : end.type;
        if (endType) {
            if (endType === "text") {
                let text = "";
                if (existingElement && existingElement.type === "text") {
                    text = existingElement.text;
                }
                else if (end.type === "text") {
                    text = end.text;
                }
                if (!text) {
                    console.error(`No text found for end binding text element for ${linearElement.id}`);
                }
                endBoundElement = (0, newElement_1.newTextElement)({
                    x: endX,
                    y: endY,
                    type: "text",
                    ...existingElement,
                    ...end,
                    text,
                });
                // to position the text correctly when coordinates not provided
                Object.assign(endBoundElement, {
                    y: end.y || linearElement.y - endBoundElement.height / 2,
                });
            }
            else {
                switch (endType) {
                    case "rectangle":
                    case "ellipse":
                    case "diamond": {
                        endBoundElement = (0, newElement_1.newElement)({
                            x: endX,
                            y: endY,
                            width,
                            height,
                            ...existingElement,
                            ...end,
                            type: endType,
                        });
                        break;
                    }
                    default: {
                        (0, common_1.assertNever)(linearElement, `Unhandled element end type "${endType}"`, true);
                    }
                }
            }
            (0, binding_1.bindBindingElement)(linearElement, endBoundElement, "orbit", "end", scene);
        }
    }
    // Safe check to early return for single point
    if (linearElement.points.length < 2) {
        return {
            linearElement,
            startBoundElement,
            endBoundElement,
        };
    }
    // Update start/end points by 0.5 so bindings don't overlap with start/end bound element coordinates.
    const endPointIndex = linearElement.points.length - 1;
    const delta = 0.5;
    const newPoints = (0, common_1.cloneJSON)(linearElement.points);
    // left to right so shift the arrow towards right
    if (linearElement.points[endPointIndex][0] >
        linearElement.points[endPointIndex - 1][0]) {
        newPoints[0][0] = delta;
        newPoints[endPointIndex][0] -= delta;
    }
    // right to left so shift the arrow towards left
    if (linearElement.points[endPointIndex][0] <
        linearElement.points[endPointIndex - 1][0]) {
        newPoints[0][0] = -delta;
        newPoints[endPointIndex][0] += delta;
    }
    // top to bottom so shift the arrow towards top
    if (linearElement.points[endPointIndex][1] >
        linearElement.points[endPointIndex - 1][1]) {
        newPoints[0][1] = delta;
        newPoints[endPointIndex][1] -= delta;
    }
    // bottom to top so shift the arrow towards bottom
    if (linearElement.points[endPointIndex][1] <
        linearElement.points[endPointIndex - 1][1]) {
        newPoints[0][1] = -delta;
        newPoints[endPointIndex][1] += delta;
    }
    Object.assign(linearElement, linearElementEditor_1.LinearElementEditor.getNormalizeElementPointsAndCoords({
        ...linearElement,
        points: newPoints,
    }));
    return {
        linearElement,
        startBoundElement,
        endBoundElement,
    };
};
class ElementStore {
    excalidrawElements = new Map();
    add = (ele) => {
        if (!ele) {
            return;
        }
        this.excalidrawElements.set(ele.id, ele);
    };
    getElements = () => {
        return (0, fractionalIndex_1.syncInvalidIndices)(Array.from(this.excalidrawElements.values()));
    };
    getElementsMap = () => {
        return (0, common_1.toBrandedType)((0, common_1.arrayToMap)(this.getElements()));
    };
    getElement = (id) => {
        return this.excalidrawElements.get(id);
    };
}
const convertToExcalidrawElements = (elementsSkeleton, opts) => {
    if (!elementsSkeleton) {
        return [];
    }
    const elements = (0, common_1.cloneJSON)(elementsSkeleton);
    const elementStore = new ElementStore();
    const elementsWithIds = new Map();
    const oldToNewElementIdMap = new Map();
    // Create individual elements
    for (const element of elements) {
        let excalidrawElement;
        const originalId = element.id;
        if (opts?.regenerateIds !== false) {
            Object.assign(element, { id: (0, common_1.randomId)() });
        }
        switch (element.type) {
            case "rectangle":
            case "ellipse":
            case "diamond": {
                const width = element?.label?.text && element.width === undefined
                    ? 0
                    : element?.width || DEFAULT_DIMENSION;
                const height = element?.label?.text && element.height === undefined
                    ? 0
                    : element?.height || DEFAULT_DIMENSION;
                excalidrawElement = (0, newElement_1.newElement)({
                    ...element,
                    width,
                    height,
                });
                break;
            }
            case "line": {
                const width = element.width || DEFAULT_LINEAR_ELEMENT_PROPS.width;
                const height = element.height || DEFAULT_LINEAR_ELEMENT_PROPS.height;
                excalidrawElement = (0, newElement_1.newLinearElement)({
                    width,
                    height,
                    points: [(0, math_1.pointFrom)(0, 0), (0, math_1.pointFrom)(width, height)],
                    ...element,
                });
                break;
            }
            case "arrow": {
                const width = element.width || DEFAULT_LINEAR_ELEMENT_PROPS.width;
                const height = element.height || DEFAULT_LINEAR_ELEMENT_PROPS.height;
                excalidrawElement = (0, newElement_1.newArrowElement)({
                    width,
                    height,
                    endArrowhead: "arrow",
                    points: [(0, math_1.pointFrom)(0, 0), (0, math_1.pointFrom)(width, height)],
                    ...element,
                    type: "arrow",
                });
                Object.assign(excalidrawElement, (0, common_1.getSizeFromPoints)(excalidrawElement.points));
                break;
            }
            case "text": {
                const fontFamily = element?.fontFamily || common_1.DEFAULT_FONT_FAMILY;
                const fontSize = element?.fontSize || common_1.DEFAULT_FONT_SIZE;
                const lineHeight = element?.lineHeight || (0, common_1.getLineHeight)(fontFamily);
                const text = element.text ?? "";
                const normalizedText = (0, textMeasurements_1.normalizeText)(text);
                const metrics = (0, textMeasurements_1.measureText)(normalizedText, (0, common_1.getFontString)({ fontFamily, fontSize }), lineHeight);
                excalidrawElement = (0, newElement_1.newTextElement)({
                    width: metrics.width,
                    height: metrics.height,
                    fontFamily,
                    fontSize,
                    ...element,
                });
                break;
            }
            case "image": {
                excalidrawElement = (0, newElement_1.newImageElement)({
                    width: element?.width || DEFAULT_DIMENSION,
                    height: element?.height || DEFAULT_DIMENSION,
                    ...element,
                });
                break;
            }
            case "frame": {
                excalidrawElement = (0, newElement_1.newFrameElement)({
                    x: 0,
                    y: 0,
                    ...element,
                });
                break;
            }
            case "magicframe": {
                excalidrawElement = (0, newElement_1.newMagicFrameElement)({
                    x: 0,
                    y: 0,
                    ...element,
                });
                break;
            }
            case "freedraw":
            case "iframe":
            case "embeddable": {
                excalidrawElement = element;
                break;
            }
            default: {
                excalidrawElement = element;
                (0, common_1.assertNever)(element, `Unhandled element type "${element.type}"`, true);
            }
        }
        const existingElement = elementStore.getElement(excalidrawElement.id);
        if (existingElement) {
            console.error(`Duplicate id found for ${excalidrawElement.id}`);
        }
        else {
            elementStore.add(excalidrawElement);
            elementsWithIds.set(excalidrawElement.id, element);
            if (originalId) {
                oldToNewElementIdMap.set(originalId, excalidrawElement.id);
            }
        }
    }
    const elementsMap = elementStore.getElementsMap();
    // we don't have a real scene, so we just use a temp scene to query and mutate elements
    const scene = new Scene_1.Scene(elementsMap);
    // Add labels and arrow bindings
    for (const [id, element] of elementsWithIds) {
        const excalidrawElement = elementStore.getElement(id);
        switch (element.type) {
            case "rectangle":
            case "ellipse":
            case "diamond":
            case "arrow": {
                if (element.label?.text) {
                    let [container, text] = bindTextToContainer(excalidrawElement, element?.label, scene);
                    elementStore.add(container);
                    elementStore.add(text);
                    if ((0, typeChecks_1.isArrowElement)(container)) {
                        const originalStart = element.type === "arrow" ? element?.start : undefined;
                        const originalEnd = element.type === "arrow" ? element?.end : undefined;
                        if (originalStart && originalStart.id) {
                            const newStartId = oldToNewElementIdMap.get(originalStart.id);
                            if (newStartId) {
                                Object.assign(originalStart, { id: newStartId });
                            }
                        }
                        if (originalEnd && originalEnd.id) {
                            const newEndId = oldToNewElementIdMap.get(originalEnd.id);
                            if (newEndId) {
                                Object.assign(originalEnd, { id: newEndId });
                            }
                        }
                        const { linearElement, startBoundElement, endBoundElement } = bindLinearElementToElement(container, originalStart, originalEnd, elementStore, scene);
                        container = linearElement;
                        elementStore.add(linearElement);
                        elementStore.add(startBoundElement);
                        elementStore.add(endBoundElement);
                    }
                }
                else {
                    switch (element.type) {
                        case "arrow": {
                            const { start, end } = element;
                            if (start && start.id) {
                                const newStartId = oldToNewElementIdMap.get(start.id);
                                Object.assign(start, { id: newStartId });
                            }
                            if (end && end.id) {
                                const newEndId = oldToNewElementIdMap.get(end.id);
                                Object.assign(end, { id: newEndId });
                            }
                            const { linearElement, startBoundElement, endBoundElement } = bindLinearElementToElement(excalidrawElement, start, end, elementStore, scene);
                            elementStore.add(linearElement);
                            elementStore.add(startBoundElement);
                            elementStore.add(endBoundElement);
                            break;
                        }
                    }
                }
                break;
            }
        }
    }
    // Once all the excalidraw elements are created, we can add frames since we
    // need to calculate coordinates and dimensions of frame which is possible after all
    // frame children are processed.
    for (const [id, element] of elementsWithIds) {
        if (element.type !== "frame" && element.type !== "magicframe") {
            continue;
        }
        const frame = elementStore.getElement(id);
        if (!frame) {
            throw new Error(`Excalidraw element with id ${id} doesn't exist`);
        }
        const childrenElements = [];
        element.children.forEach((id) => {
            const newElementId = oldToNewElementIdMap.get(id);
            if (!newElementId) {
                throw new Error(`Element with ${id} wasn't mapped correctly`);
            }
            const elementInFrame = elementStore.getElement(newElementId);
            if (!elementInFrame) {
                throw new Error(`Frame element with id ${newElementId} doesn't exist`);
            }
            Object.assign(elementInFrame, { frameId: frame.id });
            elementInFrame?.boundElements?.forEach((boundElement) => {
                const ele = elementStore.getElement(boundElement.id);
                if (!ele) {
                    throw new Error(`Bound element with id ${boundElement.id} doesn't exist`);
                }
                Object.assign(ele, { frameId: frame.id });
                childrenElements.push(ele);
            });
            childrenElements.push(elementInFrame);
        });
        let [minX, minY, maxX, maxY] = (0, bounds_1.getCommonBounds)(childrenElements);
        const PADDING = 10;
        minX = minX - PADDING;
        minY = minY - PADDING;
        maxX = maxX + PADDING;
        maxY = maxY + PADDING;
        const frameX = frame?.x || minX;
        const frameY = frame?.y || minY;
        const frameWidth = frame?.width || maxX - minX;
        const frameHeight = frame?.height || maxY - minY;
        Object.assign(frame, {
            x: frameX,
            y: frameY,
            width: frameWidth,
            height: frameHeight,
        });
        if ((0, common_1.isDevEnv)() &&
            element.children.length &&
            (frame?.x || frame?.y || frame?.width || frame?.height)) {
            console.info("User provided frame attributes are being considered, if you find this inaccurate, please remove any of the attributes - x, y, width and height so frame coordinates and dimensions are calculated automatically");
        }
    }
    return elementStore.getElements();
};
exports.convertToExcalidrawElements = convertToExcalidrawElements;
