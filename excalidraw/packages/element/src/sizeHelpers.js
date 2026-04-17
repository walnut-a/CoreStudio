"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNormalizedDimensions = exports.getLockedLinearCursorAlignSize = exports.getPerfectElementSize = exports.isElementCompletelyInViewport = exports.isElementInViewport = exports.isInvisiblySmallElement = exports.INVISIBLY_SMALL_ELEMENT_SIZE = void 0;
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const math_2 = require("@excalidraw/math");
const bounds_1 = require("./bounds");
const typeChecks_1 = require("./typeChecks");
exports.INVISIBLY_SMALL_ELEMENT_SIZE = 0.1;
// TODO:  remove invisible elements consistently actions, so that invisible elements are not recorded by the store, exported, broadcasted or persisted
//        - perhaps could be as part of a standalone 'cleanup' action, in addition to 'finalize'
//        - could also be part of `_clearElements`
const isInvisiblySmallElement = (element) => {
    if ((0, typeChecks_1.isLinearElement)(element) || (0, typeChecks_1.isFreeDrawElement)(element)) {
        return (element.points.length < 2 ||
            (element.points.length === 2 &&
                (0, typeChecks_1.isArrowElement)(element) &&
                (0, math_2.pointsEqual)(element.points[0], element.points[element.points.length - 1], exports.INVISIBLY_SMALL_ELEMENT_SIZE)));
    }
    return element.width === 0 && element.height === 0;
};
exports.isInvisiblySmallElement = isInvisiblySmallElement;
const isElementInViewport = (element, width, height, viewTransformations, elementsMap) => {
    const [x1, y1, x2, y2] = (0, bounds_1.getElementBounds)(element, elementsMap); // scene coordinates
    const topLeftSceneCoords = (0, common_1.viewportCoordsToSceneCoords)({
        clientX: viewTransformations.offsetLeft,
        clientY: viewTransformations.offsetTop,
    }, viewTransformations);
    const bottomRightSceneCoords = (0, common_1.viewportCoordsToSceneCoords)({
        clientX: viewTransformations.offsetLeft + width,
        clientY: viewTransformations.offsetTop + height,
    }, viewTransformations);
    return (topLeftSceneCoords.x <= x2 &&
        topLeftSceneCoords.y <= y2 &&
        bottomRightSceneCoords.x >= x1 &&
        bottomRightSceneCoords.y >= y1);
};
exports.isElementInViewport = isElementInViewport;
const isElementCompletelyInViewport = (elements, width, height, viewTransformations, elementsMap, padding) => {
    const [x1, y1, x2, y2] = (0, bounds_1.getCommonBounds)(elements, elementsMap); // scene coordinates
    const topLeftSceneCoords = (0, common_1.viewportCoordsToSceneCoords)({
        clientX: viewTransformations.offsetLeft + (padding?.left || 0),
        clientY: viewTransformations.offsetTop + (padding?.top || 0),
    }, viewTransformations);
    const bottomRightSceneCoords = (0, common_1.viewportCoordsToSceneCoords)({
        clientX: viewTransformations.offsetLeft + width - (padding?.right || 0),
        clientY: viewTransformations.offsetTop + height - (padding?.bottom || 0),
    }, viewTransformations);
    return (x1 >= topLeftSceneCoords.x &&
        y1 >= topLeftSceneCoords.y &&
        x2 <= bottomRightSceneCoords.x &&
        y2 <= bottomRightSceneCoords.y);
};
exports.isElementCompletelyInViewport = isElementCompletelyInViewport;
/**
 * Makes a perfect shape or diagonal/horizontal/vertical line
 */
const getPerfectElementSize = (elementType, width, height) => {
    const absWidth = Math.abs(width);
    const absHeight = Math.abs(height);
    if (elementType === "line" ||
        elementType === "arrow" ||
        elementType === "freedraw") {
        const lockedAngle = Math.round(Math.atan(absHeight / absWidth) / common_1.SHIFT_LOCKING_ANGLE) *
            common_1.SHIFT_LOCKING_ANGLE;
        if (lockedAngle === 0) {
            height = 0;
        }
        else if (lockedAngle === Math.PI / 2) {
            width = 0;
        }
        else {
            height = absWidth * Math.tan(lockedAngle) * Math.sign(height) || height;
        }
    }
    else if (elementType !== "selection") {
        height = absWidth * Math.sign(height);
    }
    return { width, height };
};
exports.getPerfectElementSize = getPerfectElementSize;
const getLockedLinearCursorAlignSize = (originX, originY, x, y, customAngle) => {
    let width = x - originX;
    let height = y - originY;
    const angle = Math.atan2(height, width);
    let lockedAngle = (Math.round(angle / common_1.SHIFT_LOCKING_ANGLE) *
        common_1.SHIFT_LOCKING_ANGLE);
    if (customAngle) {
        // If custom angle is provided, we check if the angle is close to the
        // custom angle, snap to that if close engough, otherwise snap to the
        // higher or lower angle depending on the current angle vs custom angle.
        const lower = (Math.floor(customAngle / common_1.SHIFT_LOCKING_ANGLE) *
            common_1.SHIFT_LOCKING_ANGLE);
        if ((0, math_1.radiansBetweenAngles)(angle, lower, (lower + common_1.SHIFT_LOCKING_ANGLE))) {
            if ((0, math_1.radiansDifference)(angle, customAngle) <
                common_1.SHIFT_LOCKING_ANGLE / 6) {
                lockedAngle = customAngle;
            }
            else if ((0, math_1.normalizeRadians)(angle) > (0, math_1.normalizeRadians)(customAngle)) {
                lockedAngle = (lower + common_1.SHIFT_LOCKING_ANGLE);
            }
            else {
                lockedAngle = lower;
            }
        }
    }
    if (lockedAngle === 0) {
        height = 0;
    }
    else if (lockedAngle === Math.PI / 2) {
        width = 0;
    }
    else {
        // locked angle line, y = mx + b => mx - y + b = 0
        const a1 = Math.tan(lockedAngle);
        const b1 = -1;
        const c1 = originY - a1 * originX;
        // line through cursor, perpendicular to locked angle line
        const a2 = -1 / a1;
        const b2 = -1;
        const c2 = y - a2 * x;
        // intersection of the two lines above
        const intersectX = (b1 * c2 - b2 * c1) / (a1 * b2 - a2 * b1);
        const intersectY = (c1 * a2 - c2 * a1) / (a1 * b2 - a2 * b1);
        // delta
        width = intersectX - originX;
        height = intersectY - originY;
    }
    return { width, height };
};
exports.getLockedLinearCursorAlignSize = getLockedLinearCursorAlignSize;
const getNormalizedDimensions = (element) => {
    const ret = {
        width: element.width,
        height: element.height,
        x: element.x,
        y: element.y,
    };
    if (element.width < 0) {
        const nextWidth = Math.abs(element.width);
        ret.width = nextWidth;
        ret.x = element.x - nextWidth;
    }
    if (element.height < 0) {
        const nextHeight = Math.abs(element.height);
        ret.height = nextHeight;
        ret.y = element.y - nextHeight;
    }
    return ret;
};
exports.getNormalizedDimensions = getNormalizedDimensions;
