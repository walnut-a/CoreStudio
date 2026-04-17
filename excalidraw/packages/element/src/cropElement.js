"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlipAdjustedCropPosition = exports.getUncroppedWidthAndHeight = exports.getUncroppedImageElement = exports.cropElement = exports.MINIMAL_CROP_SIZE = void 0;
const math_1 = require("@excalidraw/math");
const bounds_1 = require("./bounds");
exports.MINIMAL_CROP_SIZE = 10;
const cropElement = (element, elementsMap, transformHandle, naturalWidth, naturalHeight, pointerX, pointerY, widthAspectRatio) => {
    const { width: uncroppedWidth, height: uncroppedHeight } = (0, exports.getUncroppedWidthAndHeight)(element);
    const naturalWidthToUncropped = naturalWidth / uncroppedWidth;
    const naturalHeightToUncropped = naturalHeight / uncroppedHeight;
    const croppedLeft = (element.crop?.x ?? 0) / naturalWidthToUncropped;
    const croppedTop = (element.crop?.y ?? 0) / naturalHeightToUncropped;
    /**
     *      uncropped width
     * *––––––––––––––––––––––––*
     * |     (x,y) (natural)    |
     * |       *–––––––*        |
     * |       |///////| height | uncropped height
     * |       *–––––––*        |
     * |    width (natural)     |
     * *––––––––––––––––––––––––*
     */
    const rotatedPointer = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(pointerX, pointerY), (0, bounds_1.elementCenterPoint)(element, elementsMap), -element.angle);
    pointerX = rotatedPointer[0];
    pointerY = rotatedPointer[1];
    let nextWidth = element.width;
    let nextHeight = element.height;
    let crop = element.crop ?? {
        x: 0,
        y: 0,
        width: naturalWidth,
        height: naturalHeight,
        naturalWidth,
        naturalHeight,
    };
    const previousCropHeight = crop.height;
    const previousCropWidth = crop.width;
    const isFlippedByX = element.scale[0] === -1;
    const isFlippedByY = element.scale[1] === -1;
    let changeInHeight = pointerY - element.y;
    let changeInWidth = pointerX - element.x;
    if (transformHandle.includes("n")) {
        nextHeight = (0, math_1.clamp)(element.height - changeInHeight, exports.MINIMAL_CROP_SIZE, isFlippedByY ? uncroppedHeight - croppedTop : element.height + croppedTop);
    }
    if (transformHandle.includes("s")) {
        changeInHeight = pointerY - element.y - element.height;
        nextHeight = (0, math_1.clamp)(element.height + changeInHeight, exports.MINIMAL_CROP_SIZE, isFlippedByY ? element.height + croppedTop : uncroppedHeight - croppedTop);
    }
    if (transformHandle.includes("e")) {
        changeInWidth = pointerX - element.x - element.width;
        nextWidth = (0, math_1.clamp)(element.width + changeInWidth, exports.MINIMAL_CROP_SIZE, isFlippedByX ? element.width + croppedLeft : uncroppedWidth - croppedLeft);
    }
    if (transformHandle.includes("w")) {
        nextWidth = (0, math_1.clamp)(element.width - changeInWidth, exports.MINIMAL_CROP_SIZE, isFlippedByX ? uncroppedWidth - croppedLeft : element.width + croppedLeft);
    }
    const updateCropWidthAndHeight = (crop) => {
        crop.height = nextHeight * naturalHeightToUncropped;
        crop.width = nextWidth * naturalWidthToUncropped;
    };
    updateCropWidthAndHeight(crop);
    const adjustFlipForHandle = (handle, crop) => {
        updateCropWidthAndHeight(crop);
        if (handle.includes("n")) {
            if (!isFlippedByY) {
                crop.y += previousCropHeight - crop.height;
            }
        }
        if (handle.includes("s")) {
            if (isFlippedByY) {
                crop.y += previousCropHeight - crop.height;
            }
        }
        if (handle.includes("e")) {
            if (isFlippedByX) {
                crop.x += previousCropWidth - crop.width;
            }
        }
        if (handle.includes("w")) {
            if (!isFlippedByX) {
                crop.x += previousCropWidth - crop.width;
            }
        }
    };
    switch (transformHandle) {
        case "n": {
            if (widthAspectRatio) {
                const distanceToLeft = croppedLeft + element.width / 2;
                const distanceToRight = uncroppedWidth - croppedLeft - element.width / 2;
                const MAX_WIDTH = Math.min(distanceToLeft, distanceToRight) * 2;
                nextWidth = (0, math_1.clamp)(nextHeight * widthAspectRatio, exports.MINIMAL_CROP_SIZE, MAX_WIDTH);
                nextHeight = nextWidth / widthAspectRatio;
            }
            adjustFlipForHandle(transformHandle, crop);
            if (widthAspectRatio) {
                crop.x += (previousCropWidth - crop.width) / 2;
            }
            break;
        }
        case "s": {
            if (widthAspectRatio) {
                const distanceToLeft = croppedLeft + element.width / 2;
                const distanceToRight = uncroppedWidth - croppedLeft - element.width / 2;
                const MAX_WIDTH = Math.min(distanceToLeft, distanceToRight) * 2;
                nextWidth = (0, math_1.clamp)(nextHeight * widthAspectRatio, exports.MINIMAL_CROP_SIZE, MAX_WIDTH);
                nextHeight = nextWidth / widthAspectRatio;
            }
            adjustFlipForHandle(transformHandle, crop);
            if (widthAspectRatio) {
                crop.x += (previousCropWidth - crop.width) / 2;
            }
            break;
        }
        case "w": {
            if (widthAspectRatio) {
                const distanceToTop = croppedTop + element.height / 2;
                const distanceToBottom = uncroppedHeight - croppedTop - element.height / 2;
                const MAX_HEIGHT = Math.min(distanceToTop, distanceToBottom) * 2;
                nextHeight = (0, math_1.clamp)(nextWidth / widthAspectRatio, exports.MINIMAL_CROP_SIZE, MAX_HEIGHT);
                nextWidth = nextHeight * widthAspectRatio;
            }
            adjustFlipForHandle(transformHandle, crop);
            if (widthAspectRatio) {
                crop.y += (previousCropHeight - crop.height) / 2;
            }
            break;
        }
        case "e": {
            if (widthAspectRatio) {
                const distanceToTop = croppedTop + element.height / 2;
                const distanceToBottom = uncroppedHeight - croppedTop - element.height / 2;
                const MAX_HEIGHT = Math.min(distanceToTop, distanceToBottom) * 2;
                nextHeight = (0, math_1.clamp)(nextWidth / widthAspectRatio, exports.MINIMAL_CROP_SIZE, MAX_HEIGHT);
                nextWidth = nextHeight * widthAspectRatio;
            }
            adjustFlipForHandle(transformHandle, crop);
            if (widthAspectRatio) {
                crop.y += (previousCropHeight - crop.height) / 2;
            }
            break;
        }
        case "ne": {
            if (widthAspectRatio) {
                if (changeInWidth > -changeInHeight) {
                    const MAX_HEIGHT = isFlippedByY
                        ? uncroppedHeight - croppedTop
                        : croppedTop + element.height;
                    nextHeight = (0, math_1.clamp)(nextWidth / widthAspectRatio, exports.MINIMAL_CROP_SIZE, MAX_HEIGHT);
                    nextWidth = nextHeight * widthAspectRatio;
                }
                else {
                    const MAX_WIDTH = isFlippedByX
                        ? croppedLeft + element.width
                        : uncroppedWidth - croppedLeft;
                    nextWidth = (0, math_1.clamp)(nextHeight * widthAspectRatio, exports.MINIMAL_CROP_SIZE, MAX_WIDTH);
                    nextHeight = nextWidth / widthAspectRatio;
                }
            }
            adjustFlipForHandle(transformHandle, crop);
            break;
        }
        case "nw": {
            if (widthAspectRatio) {
                if (changeInWidth < changeInHeight) {
                    const MAX_HEIGHT = isFlippedByY
                        ? uncroppedHeight - croppedTop
                        : croppedTop + element.height;
                    nextHeight = (0, math_1.clamp)(nextWidth / widthAspectRatio, exports.MINIMAL_CROP_SIZE, MAX_HEIGHT);
                    nextWidth = nextHeight * widthAspectRatio;
                }
                else {
                    const MAX_WIDTH = isFlippedByX
                        ? uncroppedWidth - croppedLeft
                        : croppedLeft + element.width;
                    nextWidth = (0, math_1.clamp)(nextHeight * widthAspectRatio, exports.MINIMAL_CROP_SIZE, MAX_WIDTH);
                    nextHeight = nextWidth / widthAspectRatio;
                }
            }
            adjustFlipForHandle(transformHandle, crop);
            break;
        }
        case "se": {
            if (widthAspectRatio) {
                if (changeInWidth > changeInHeight) {
                    const MAX_HEIGHT = isFlippedByY
                        ? croppedTop + element.height
                        : uncroppedHeight - croppedTop;
                    nextHeight = (0, math_1.clamp)(nextWidth / widthAspectRatio, exports.MINIMAL_CROP_SIZE, MAX_HEIGHT);
                    nextWidth = nextHeight * widthAspectRatio;
                }
                else {
                    const MAX_WIDTH = isFlippedByX
                        ? croppedLeft + element.width
                        : uncroppedWidth - croppedLeft;
                    nextWidth = (0, math_1.clamp)(nextHeight * widthAspectRatio, exports.MINIMAL_CROP_SIZE, MAX_WIDTH);
                    nextHeight = nextWidth / widthAspectRatio;
                }
            }
            adjustFlipForHandle(transformHandle, crop);
            break;
        }
        case "sw": {
            if (widthAspectRatio) {
                if (-changeInWidth > changeInHeight) {
                    const MAX_HEIGHT = isFlippedByY
                        ? croppedTop + element.height
                        : uncroppedHeight - croppedTop;
                    nextHeight = (0, math_1.clamp)(nextWidth / widthAspectRatio, exports.MINIMAL_CROP_SIZE, MAX_HEIGHT);
                    nextWidth = nextHeight * widthAspectRatio;
                }
                else {
                    const MAX_WIDTH = isFlippedByX
                        ? uncroppedWidth - croppedLeft
                        : croppedLeft + element.width;
                    nextWidth = (0, math_1.clamp)(nextHeight * widthAspectRatio, exports.MINIMAL_CROP_SIZE, MAX_WIDTH);
                    nextHeight = nextWidth / widthAspectRatio;
                }
            }
            adjustFlipForHandle(transformHandle, crop);
            break;
        }
        default:
            break;
    }
    const newOrigin = recomputeOrigin(element, transformHandle, nextWidth, nextHeight, !!widthAspectRatio);
    // reset crop to null if we're back to orig size
    if ((0, math_1.isCloseTo)(crop.width, crop.naturalWidth) &&
        (0, math_1.isCloseTo)(crop.height, crop.naturalHeight)) {
        crop = null;
    }
    return {
        x: newOrigin[0],
        y: newOrigin[1],
        width: nextWidth,
        height: nextHeight,
        crop,
    };
};
exports.cropElement = cropElement;
const recomputeOrigin = (stateAtCropStart, transformHandle, width, height, shouldMaintainAspectRatio) => {
    const [x1, y1, x2, y2] = (0, bounds_1.getResizedElementAbsoluteCoords)(stateAtCropStart, stateAtCropStart.width, stateAtCropStart.height, true);
    const startTopLeft = (0, math_1.pointFrom)(x1, y1);
    const startBottomRight = (0, math_1.pointFrom)(x2, y2);
    const startCenter = (0, math_1.pointCenter)(startTopLeft, startBottomRight);
    const [newBoundsX1, newBoundsY1, newBoundsX2, newBoundsY2] = (0, bounds_1.getResizedElementAbsoluteCoords)(stateAtCropStart, width, height, true);
    const newBoundsWidth = newBoundsX2 - newBoundsX1;
    const newBoundsHeight = newBoundsY2 - newBoundsY1;
    // Calculate new topLeft based on fixed corner during resize
    let newTopLeft = [...startTopLeft];
    if (["n", "w", "nw"].includes(transformHandle)) {
        newTopLeft = [
            startBottomRight[0] - Math.abs(newBoundsWidth),
            startBottomRight[1] - Math.abs(newBoundsHeight),
        ];
    }
    if (transformHandle === "ne") {
        const bottomLeft = [startTopLeft[0], startBottomRight[1]];
        newTopLeft = [bottomLeft[0], bottomLeft[1] - Math.abs(newBoundsHeight)];
    }
    if (transformHandle === "sw") {
        const topRight = [startBottomRight[0], startTopLeft[1]];
        newTopLeft = [topRight[0] - Math.abs(newBoundsWidth), topRight[1]];
    }
    if (shouldMaintainAspectRatio) {
        if (["s", "n"].includes(transformHandle)) {
            newTopLeft[0] = startCenter[0] - newBoundsWidth / 2;
        }
        if (["e", "w"].includes(transformHandle)) {
            newTopLeft[1] = startCenter[1] - newBoundsHeight / 2;
        }
    }
    // adjust topLeft to new rotation point
    const angle = stateAtCropStart.angle;
    const rotatedTopLeft = (0, math_1.pointRotateRads)(newTopLeft, startCenter, angle);
    const newCenter = [
        newTopLeft[0] + Math.abs(newBoundsWidth) / 2,
        newTopLeft[1] + Math.abs(newBoundsHeight) / 2,
    ];
    const rotatedNewCenter = (0, math_1.pointRotateRads)(newCenter, startCenter, angle);
    newTopLeft = (0, math_1.pointRotateRads)(rotatedTopLeft, rotatedNewCenter, -angle);
    const newOrigin = [...newTopLeft];
    newOrigin[0] += stateAtCropStart.x - newBoundsX1;
    newOrigin[1] += stateAtCropStart.y - newBoundsY1;
    return newOrigin;
};
// refer to https://link.excalidraw.com/l/6rfy1007QOo/6stx5PmRn0k
const getUncroppedImageElement = (element, elementsMap) => {
    if (element.crop) {
        const { width, height } = (0, exports.getUncroppedWidthAndHeight)(element);
        const [x1, y1, x2, y2, cx, cy] = (0, bounds_1.getElementAbsoluteCoords)(element, elementsMap);
        const topLeftVector = (0, math_1.vectorFromPoint)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(x1, y1), (0, math_1.pointFrom)(cx, cy), element.angle));
        const topRightVector = (0, math_1.vectorFromPoint)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(x2, y1), (0, math_1.pointFrom)(cx, cy), element.angle));
        const topEdgeNormalized = (0, math_1.vectorNormalize)((0, math_1.vectorSubtract)(topRightVector, topLeftVector));
        const bottomLeftVector = (0, math_1.vectorFromPoint)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(x1, y2), (0, math_1.pointFrom)(cx, cy), element.angle));
        const leftEdgeVector = (0, math_1.vectorSubtract)(bottomLeftVector, topLeftVector);
        const leftEdgeNormalized = (0, math_1.vectorNormalize)(leftEdgeVector);
        const { cropX, cropY } = adjustCropPosition(element.crop, element.scale);
        const rotatedTopLeft = (0, math_1.vectorAdd)((0, math_1.vectorAdd)(topLeftVector, (0, math_1.vectorScale)(topEdgeNormalized, (-cropX * width) / element.crop.naturalWidth)), (0, math_1.vectorScale)(leftEdgeNormalized, (-cropY * height) / element.crop.naturalHeight));
        const center = (0, math_1.pointFromVector)((0, math_1.vectorAdd)((0, math_1.vectorAdd)(rotatedTopLeft, (0, math_1.vectorScale)(topEdgeNormalized, width / 2)), (0, math_1.vectorScale)(leftEdgeNormalized, height / 2)));
        const unrotatedTopLeft = (0, math_1.pointRotateRads)((0, math_1.pointFromVector)(rotatedTopLeft), center, -element.angle);
        const uncroppedElement = {
            ...element,
            x: unrotatedTopLeft[0],
            y: unrotatedTopLeft[1],
            width,
            height,
            crop: null,
        };
        return uncroppedElement;
    }
    return element;
};
exports.getUncroppedImageElement = getUncroppedImageElement;
const getUncroppedWidthAndHeight = (element) => {
    if (element.crop) {
        const width = element.width / (element.crop.width / element.crop.naturalWidth);
        const height = element.height / (element.crop.height / element.crop.naturalHeight);
        return {
            width,
            height,
        };
    }
    return {
        width: element.width,
        height: element.height,
    };
};
exports.getUncroppedWidthAndHeight = getUncroppedWidthAndHeight;
const adjustCropPosition = (crop, scale) => {
    let cropX = crop.x;
    let cropY = crop.y;
    const flipX = scale[0] === -1;
    const flipY = scale[1] === -1;
    if (flipX) {
        cropX = crop.naturalWidth - Math.abs(cropX) - crop.width;
    }
    if (flipY) {
        cropY = crop.naturalHeight - Math.abs(cropY) - crop.height;
    }
    return {
        cropX,
        cropY,
    };
};
const getFlipAdjustedCropPosition = (element, natural = false) => {
    const crop = element.crop;
    if (!crop) {
        return null;
    }
    const isFlippedByX = element.scale[0] === -1;
    const isFlippedByY = element.scale[1] === -1;
    let cropX = crop.x;
    let cropY = crop.y;
    if (isFlippedByX) {
        cropX = crop.naturalWidth - crop.width - crop.x;
    }
    if (isFlippedByY) {
        cropY = crop.naturalHeight - crop.height - crop.y;
    }
    if (natural) {
        return {
            x: cropX,
            y: cropY,
        };
    }
    const { width, height } = (0, exports.getUncroppedWidthAndHeight)(element);
    return {
        x: cropX / (crop.naturalWidth / width),
        y: cropY / (crop.naturalHeight / height),
    };
};
exports.getFlipAdjustedCropPosition = getFlipAdjustedCropPosition;
