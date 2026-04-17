"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectFixedPointOntoDiagonal = exports.getSnapOutlineMidPoint = exports.getCornerRadius = exports.isPathALoop = void 0;
exports.deconstructLinearOrFreeDrawElement = deconstructLinearOrFreeDrawElement;
exports.deconstructRectanguloidElement = deconstructRectanguloidElement;
exports.getDiamondBaseCorners = getDiamondBaseCorners;
exports.deconstructDiamondElement = deconstructDiamondElement;
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const bounds_1 = require("./bounds");
const shape_1 = require("./shape");
const collision_1 = require("./collision");
const linearElementEditor_1 = require("./linearElementEditor");
const typeChecks_1 = require("./typeChecks");
const binding_1 = require("./binding");
const binding_2 = require("./binding");
const ElementShapesCache = new WeakMap();
const getElementShapesCacheEntry = (element, offset) => {
    const record = ElementShapesCache.get(element);
    if (!record) {
        return undefined;
    }
    const { version, shapes } = record;
    if (version !== element.version) {
        ElementShapesCache.delete(element);
        return undefined;
    }
    return shapes.get(offset);
};
const setElementShapesCacheEntry = (element, shape, offset) => {
    const record = ElementShapesCache.get(element);
    if (!record) {
        ElementShapesCache.set(element, {
            version: element.version,
            shapes: new Map([[offset, shape]]),
        });
        return;
    }
    const { version, shapes } = record;
    if (version !== element.version) {
        ElementShapesCache.set(element, {
            version: element.version,
            shapes: new Map([[offset, shape]]),
        });
        return;
    }
    shapes.set(offset, shape);
};
/**
 * Returns the **rotated** components of freedraw, line or arrow elements.
 *
 * @param element The linear element to deconstruct
 * @returns The rotated in components.
 */
function deconstructLinearOrFreeDrawElement(element, elementsMap) {
    const cachedShape = getElementShapesCacheEntry(element, 0);
    if (cachedShape) {
        return cachedShape;
    }
    const ops = (0, shape_1.generateLinearCollisionShape)(element, elementsMap);
    const lines = [];
    const curves = [];
    for (let idx = 0; idx < ops.length; idx += 1) {
        const op = ops[idx];
        const prevPoint = ops[idx - 1] && (0, math_1.pointFromArray)(ops[idx - 1].data.slice(-2));
        switch (op.op) {
            case "move":
                continue;
            case "lineTo":
                if (!prevPoint) {
                    throw new Error("prevPoint is undefined");
                }
                lines.push((0, math_1.lineSegment)((0, math_1.pointFrom)(element.x + prevPoint[0], element.y + prevPoint[1]), (0, math_1.pointFrom)(element.x + op.data[0], element.y + op.data[1])));
                continue;
            case "bcurveTo":
                if (!prevPoint) {
                    throw new Error("prevPoint is undefined");
                }
                curves.push((0, math_1.curve)((0, math_1.pointFrom)(element.x + prevPoint[0], element.y + prevPoint[1]), (0, math_1.pointFrom)(element.x + op.data[0], element.y + op.data[1]), (0, math_1.pointFrom)(element.x + op.data[2], element.y + op.data[3]), (0, math_1.pointFrom)(element.x + op.data[4], element.y + op.data[5])));
                continue;
            default: {
                console.error("Unknown op type", op.op);
            }
        }
    }
    const shape = [lines, curves];
    setElementShapesCacheEntry(element, shape, 0);
    return shape;
}
/**
 * Get the building components of a rectanguloid element in the form of
 * line segments and curves **unrotated**.
 *
 * @param element Target rectanguloid element
 * @param offset Optional offset to expand the rectanguloid shape
 * @returns Tuple of **unrotated** line segments (0) and curves (1)
 */
function deconstructRectanguloidElement(element, offset = 0) {
    const cachedShape = getElementShapesCacheEntry(element, offset);
    if (cachedShape) {
        return cachedShape;
    }
    let radius = (0, exports.getCornerRadius)(Math.min(element.width, element.height), element);
    if (radius === 0) {
        radius = 0.01;
    }
    const r = (0, math_1.rectangle)((0, math_1.pointFrom)(element.x, element.y), (0, math_1.pointFrom)(element.x + element.width, element.y + element.height));
    const top = (0, math_1.lineSegment)((0, math_1.pointFrom)(r[0][0] + radius, r[0][1]), (0, math_1.pointFrom)(r[1][0] - radius, r[0][1]));
    const right = (0, math_1.lineSegment)((0, math_1.pointFrom)(r[1][0], r[0][1] + radius), (0, math_1.pointFrom)(r[1][0], r[1][1] - radius));
    const bottom = (0, math_1.lineSegment)((0, math_1.pointFrom)(r[0][0] + radius, r[1][1]), (0, math_1.pointFrom)(r[1][0] - radius, r[1][1]));
    const left = (0, math_1.lineSegment)((0, math_1.pointFrom)(r[0][0], r[1][1] - radius), (0, math_1.pointFrom)(r[0][0], r[0][1] + radius));
    const baseCorners = [
        (0, math_1.curve)(left[1], (0, math_1.pointFrom)(left[1][0] + (2 / 3) * (r[0][0] - left[1][0]), left[1][1] + (2 / 3) * (r[0][1] - left[1][1])), (0, math_1.pointFrom)(top[0][0] + (2 / 3) * (r[0][0] - top[0][0]), top[0][1] + (2 / 3) * (r[0][1] - top[0][1])), top[0]), // TOP LEFT
        (0, math_1.curve)(top[1], (0, math_1.pointFrom)(top[1][0] + (2 / 3) * (r[1][0] - top[1][0]), top[1][1] + (2 / 3) * (r[0][1] - top[1][1])), (0, math_1.pointFrom)(right[0][0] + (2 / 3) * (r[1][0] - right[0][0]), right[0][1] + (2 / 3) * (r[0][1] - right[0][1])), right[0]), // TOP RIGHT
        (0, math_1.curve)(right[1], (0, math_1.pointFrom)(right[1][0] + (2 / 3) * (r[1][0] - right[1][0]), right[1][1] + (2 / 3) * (r[1][1] - right[1][1])), (0, math_1.pointFrom)(bottom[1][0] + (2 / 3) * (r[1][0] - bottom[1][0]), bottom[1][1] + (2 / 3) * (r[1][1] - bottom[1][1])), bottom[1]), // BOTTOM RIGHT
        (0, math_1.curve)(bottom[0], (0, math_1.pointFrom)(bottom[0][0] + (2 / 3) * (r[0][0] - bottom[0][0]), bottom[0][1] + (2 / 3) * (r[1][1] - bottom[0][1])), (0, math_1.pointFrom)(left[0][0] + (2 / 3) * (r[0][0] - left[0][0]), left[0][1] + (2 / 3) * (r[1][1] - left[0][1])), left[0]), // BOTTOM LEFT
    ];
    const corners = offset > 0
        ? baseCorners.map((corner) => (0, math_1.curveCatmullRomCubicApproxPoints)((0, math_1.curveOffsetPoints)(corner, offset)))
        : [
            [baseCorners[0]],
            [baseCorners[1]],
            [baseCorners[2]],
            [baseCorners[3]],
        ];
    const sides = [
        (0, math_1.lineSegment)(corners[0][corners[0].length - 1][3], corners[1][0][0]),
        (0, math_1.lineSegment)(corners[1][corners[1].length - 1][3], corners[2][0][0]),
        (0, math_1.lineSegment)(corners[2][corners[2].length - 1][3], corners[3][0][0]),
        (0, math_1.lineSegment)(corners[3][corners[3].length - 1][3], corners[0][0][0]),
    ];
    const shape = [sides, corners.flat()];
    setElementShapesCacheEntry(element, shape, offset);
    return shape;
}
function getDiamondBaseCorners(element, offset = 0) {
    const [topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY] = (0, bounds_1.getDiamondPoints)(element);
    const verticalRadius = element.roundness
        ? (0, exports.getCornerRadius)(Math.abs(topX - leftX), element)
        : (topX - leftX) * 0.01;
    const horizontalRadius = element.roundness
        ? (0, exports.getCornerRadius)(Math.abs(rightY - topY), element)
        : (rightY - topY) * 0.01;
    const [top, right, bottom, left] = [
        (0, math_1.pointFrom)(element.x + topX, element.y + topY),
        (0, math_1.pointFrom)(element.x + rightX, element.y + rightY),
        (0, math_1.pointFrom)(element.x + bottomX, element.y + bottomY),
        (0, math_1.pointFrom)(element.x + leftX, element.y + leftY),
    ];
    return [
        (0, math_1.curve)((0, math_1.pointFrom)(right[0] - verticalRadius, right[1] - horizontalRadius), right, right, (0, math_1.pointFrom)(right[0] - verticalRadius, right[1] + horizontalRadius)), // RIGHT
        (0, math_1.curve)((0, math_1.pointFrom)(bottom[0] + verticalRadius, bottom[1] - horizontalRadius), bottom, bottom, (0, math_1.pointFrom)(bottom[0] - verticalRadius, bottom[1] - horizontalRadius)), // BOTTOM
        (0, math_1.curve)((0, math_1.pointFrom)(left[0] + verticalRadius, left[1] + horizontalRadius), left, left, (0, math_1.pointFrom)(left[0] + verticalRadius, left[1] - horizontalRadius)), // LEFT
        (0, math_1.curve)((0, math_1.pointFrom)(top[0] - verticalRadius, top[1] + horizontalRadius), top, top, (0, math_1.pointFrom)(top[0] + verticalRadius, top[1] + horizontalRadius)), // TOP
    ];
}
/**
 * Get the **unrotated** building components of a diamond element
 * in the form of line segments and curves as a tuple, in this order.
 *
 * @param element The element to deconstruct
 * @param offset An optional offset
 * @returns Tuple of line **unrotated** segments (0) and curves (1)
 */
function deconstructDiamondElement(element, offset = 0) {
    const cachedShape = getElementShapesCacheEntry(element, offset);
    if (cachedShape) {
        return cachedShape;
    }
    const baseCorners = getDiamondBaseCorners(element, offset);
    const corners = baseCorners.map((corner) => (0, math_1.curveCatmullRomCubicApproxPoints)((0, math_1.curveOffsetPoints)(corner, offset)));
    const sides = [
        (0, math_1.lineSegment)(corners[0][corners[0].length - 1][3], corners[1][0][0]),
        (0, math_1.lineSegment)(corners[1][corners[1].length - 1][3], corners[2][0][0]),
        (0, math_1.lineSegment)(corners[2][corners[2].length - 1][3], corners[3][0][0]),
        (0, math_1.lineSegment)(corners[3][corners[3].length - 1][3], corners[0][0][0]),
    ];
    const shape = [sides, corners.flat()];
    setElementShapesCacheEntry(element, shape, offset);
    return shape;
}
// Checks if the first and last point are close enough
// to be considered a loop
const isPathALoop = (points, 
/** supply if you want the loop detection to account for current zoom */
zoomValue = 1) => {
    if (points.length >= 3) {
        const [first, last] = [points[0], points[points.length - 1]];
        const distance = (0, math_1.pointDistance)(first, last);
        // Adjusting LINE_CONFIRM_THRESHOLD to current zoom so that when zoomed in
        // really close we make the threshold smaller, and vice versa.
        return distance <= common_1.LINE_CONFIRM_THRESHOLD / zoomValue;
    }
    return false;
};
exports.isPathALoop = isPathALoop;
const getCornerRadius = (x, element) => {
    if (element.roundness?.type === common_1.ROUNDNESS.PROPORTIONAL_RADIUS ||
        element.roundness?.type === common_1.ROUNDNESS.LEGACY) {
        return x * common_1.DEFAULT_PROPORTIONAL_RADIUS;
    }
    if (element.roundness?.type === common_1.ROUNDNESS.ADAPTIVE_RADIUS) {
        const fixedRadiusSize = element.roundness?.value ?? common_1.DEFAULT_ADAPTIVE_RADIUS;
        const CUTOFF_SIZE = fixedRadiusSize / common_1.DEFAULT_PROPORTIONAL_RADIUS;
        if (x <= CUTOFF_SIZE) {
            return x * common_1.DEFAULT_PROPORTIONAL_RADIUS;
        }
        return fixedRadiusSize;
    }
    return 0;
};
exports.getCornerRadius = getCornerRadius;
const getDiagonalsForBindableElement = (element, elementsMap) => {
    // for rectangles, shrink the diagonals a bit because there's something
    // going on with the focus points around the corners. Ask Mark for details.
    const OFFSET_PX = element.type === "rectangle" ? 15 : 0;
    const shrinkSegment = (seg) => {
        const v = (0, math_1.vectorNormalize)((0, math_1.vectorFromPoint)(seg[1], seg[0]));
        const offset = (0, math_1.vectorScale)(v, OFFSET_PX);
        return (0, math_1.lineSegment)((0, math_1.pointTranslate)(seg[0], offset), (0, math_1.pointTranslate)(seg[1], (0, math_1.vectorScale)(offset, -1)));
    };
    const center = (0, bounds_1.elementCenterPoint)(element, elementsMap);
    const diagonalOne = shrinkSegment((0, typeChecks_1.isRectangularElement)(element)
        ? (0, math_1.lineSegment)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x, element.y), center, element.angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + element.width, element.y + element.height), center, element.angle))
        : (0, math_1.lineSegment)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + element.width / 2, element.y), center, element.angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + element.width / 2, element.y + element.height), center, element.angle)));
    const diagonalTwo = shrinkSegment((0, typeChecks_1.isRectangularElement)(element)
        ? (0, math_1.lineSegment)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + element.width, element.y), center, element.angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x, element.y + element.height), center, element.angle))
        : (0, math_1.lineSegment)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x, element.y + element.height / 2), center, element.angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + element.width, element.y + element.height / 2), center, element.angle)));
    return [diagonalOne, diagonalTwo];
};
const getSnapOutlineMidPoint = (point, element, elementsMap, zoom) => {
    const center = (0, bounds_1.elementCenterPoint)(element, elementsMap);
    const sideMidpoints = element.type === "diamond"
        ? getDiamondBaseCorners(element).map((curve) => {
            const point = (0, math_1.bezierEquation)(curve, 0.5);
            const rotatedPoint = (0, math_1.pointRotateRads)(point, center, element.angle);
            return (0, math_1.pointFrom)(rotatedPoint[0], rotatedPoint[1]);
        })
        : [
            // RIGHT midpoint
            (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + element.width, element.y + element.height / 2), center, element.angle),
            // BOTTOM midpoint
            (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + element.width / 2, element.y + element.height), center, element.angle),
            // LEFT midpoint
            (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x, element.y + element.height / 2), center, element.angle),
            // TOP midpoint
            (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + element.width / 2, element.y), center, element.angle),
        ];
    const candidate = sideMidpoints.find((midpoint) => (0, math_1.pointDistance)(point, midpoint) <=
        (0, binding_1.maxBindingDistance_simple)(zoom) + element.strokeWidth / 2 &&
        !(0, collision_1.hitElementItself)({
            point,
            element,
            threshold: 0,
            elementsMap,
            overrideShouldTestInside: true,
        }));
    return candidate;
};
exports.getSnapOutlineMidPoint = getSnapOutlineMidPoint;
const projectFixedPointOntoDiagonal = (arrow, point, element, startOrEnd, elementsMap, zoom, isMidpointSnappingEnabled = true) => {
    (0, common_1.invariant)(arrow.points.length >= 2, "Arrow must have at least two points");
    if (arrow.width < 3 && arrow.height < 3) {
        return null;
    }
    if (isMidpointSnappingEnabled) {
        const sideMidPoint = (0, exports.getSnapOutlineMidPoint)(point, element, elementsMap, zoom);
        if (sideMidPoint) {
            return sideMidPoint;
        }
    }
    // Do the projection onto the diagonals (or center lines
    // for non-rectangular shapes)
    const [diagonalOne, diagonalTwo] = getDiagonalsForBindableElement(element, elementsMap);
    // To avoid working with stale arrow state, we use the opposite focus point
    // of the current endpoint, which will always be unchanged during moving of
    // the endpoint. This is only needed when the arrow has only two points.
    let a = linearElementEditor_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(arrow, startOrEnd === "start" ? 1 : arrow.points.length - 2, elementsMap);
    if (arrow.points.length === 2) {
        const otherBinding = startOrEnd === "start" ? arrow.endBinding : arrow.startBinding;
        const otherBindable = otherBinding &&
            elementsMap.get(otherBinding.elementId);
        const otherFocusPoint = otherBinding &&
            otherBindable &&
            (0, binding_2.getGlobalFixedPointForBindableElement)((0, binding_2.normalizeFixedPoint)(otherBinding.fixedPoint), otherBindable, elementsMap);
        if (otherFocusPoint) {
            a = otherFocusPoint;
        }
    }
    const b = (0, math_1.pointFromVector)((0, math_1.vectorScale)((0, math_1.vectorFromPoint)(point, a), 2 * (0, math_1.pointDistance)(a, point) +
        Math.max((0, math_1.pointDistance)(diagonalOne[0], diagonalOne[1]), (0, math_1.pointDistance)(diagonalTwo[0], diagonalTwo[1]))), a);
    const intersector = (0, math_1.lineSegment)(b, a);
    const p1 = (0, math_1.lineSegmentIntersectionPoints)(diagonalOne, intersector);
    const p2 = (0, math_1.lineSegmentIntersectionPoints)(diagonalTwo, intersector);
    const d1 = p1 && (0, math_1.pointDistance)(a, p1);
    const d2 = p2 && (0, math_1.pointDistance)(a, p2);
    let projection = null;
    if (d1 != null && d2 != null) {
        projection = d1 < d2 ? p1 : p2;
    }
    else {
        projection = p1 || p2 || null;
    }
    if (projection && (0, collision_1.isPointInElement)(projection, element, elementsMap)) {
        return projection;
    }
    return null;
};
exports.projectFixedPointOntoDiagonal = projectFixedPointOntoDiagonal;
