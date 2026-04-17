"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBindableElementInsideOtherBindable = exports.isPointInElement = exports.intersectElementWithLineSegment = exports.getHoveredElementForFocusPoint = exports.getHoveredElementForBinding = exports.getAllHoveredElementAtPoint = exports.hitElementBoundText = exports.hitElementBoundingBoxOnly = exports.hitElementBoundingBox = exports.hitElementItself = exports.shouldTestInside = void 0;
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const ellipse_1 = require("@excalidraw/math/ellipse");
const utils_1 = require("./utils");
const bounds_1 = require("./bounds");
const typeChecks_1 = require("./typeChecks");
const utils_2 = require("./utils");
const textElement_1 = require("./textElement");
const linearElementEditor_1 = require("./linearElementEditor");
const distance_1 = require("./distance");
const binding_1 = require("./binding");
const shouldTestInside = (element) => {
    if (element.type === "arrow") {
        return false;
    }
    const isDraggableFromInside = !(0, common_1.isTransparent)(element.backgroundColor) ||
        (0, typeChecks_1.hasBoundTextElement)(element) ||
        (0, typeChecks_1.isIframeLikeElement)(element) ||
        (0, typeChecks_1.isTextElement)(element);
    if (element.type === "line") {
        return isDraggableFromInside && (0, utils_1.isPathALoop)(element.points);
    }
    if (element.type === "freedraw") {
        return isDraggableFromInside && (0, utils_1.isPathALoop)(element.points);
    }
    return isDraggableFromInside || (0, typeChecks_1.isImageElement)(element);
};
exports.shouldTestInside = shouldTestInside;
let cachedPoint = null;
let cachedElement = null;
let cachedThreshold = Infinity;
let cachedHit = false;
let cachedOverrideShouldTestInside = false;
const hitElementItself = ({ point, element, threshold, elementsMap, frameNameBound = null, overrideShouldTestInside = false, }) => {
    // Return cached result if the same point and element version is tested again
    if (cachedPoint &&
        (0, math_1.pointsEqual)(point, cachedPoint) &&
        cachedThreshold <= threshold &&
        overrideShouldTestInside === cachedOverrideShouldTestInside) {
        const derefElement = cachedElement?.deref();
        if (derefElement &&
            derefElement.id === element.id &&
            derefElement.version === element.version &&
            derefElement.versionNonce === element.versionNonce) {
            return cachedHit;
        }
    }
    // Hit test against a frame's name
    const hitFrameName = frameNameBound
        ? (0, math_1.isPointWithinBounds)((0, math_1.pointFrom)(frameNameBound.x - threshold, frameNameBound.y - threshold), point, (0, math_1.pointFrom)(frameNameBound.x + frameNameBound.width + threshold, frameNameBound.y + frameNameBound.height + threshold))
        : false;
    // Hit test against the extended, rotated bounding box of the element first
    const bounds = (0, bounds_1.getElementBounds)(element, elementsMap, true);
    const hitBounds = isPointInRotatedBounds(point, bounds, element.angle, threshold);
    // PERF: Bail out early if the point is not even in the
    // rotated bounding box or not hitting the frame name (saves 99%)
    if (!hitBounds && !hitFrameName) {
        return false;
    }
    // Do the precise (and relatively costly) hit test
    const hitElement = (overrideShouldTestInside ? true : (0, exports.shouldTestInside)(element))
        ? // Since `inShape` tests STRICTLY againt the insides of a shape
            // we would need `onShape` as well to include the "borders"
            (0, exports.isPointInElement)(point, element, elementsMap) ||
                isPointOnElementOutline(point, element, elementsMap, threshold)
        : isPointOnElementOutline(point, element, elementsMap, threshold);
    const result = hitElement || hitFrameName;
    // Cache end result
    cachedPoint = point;
    cachedElement = new WeakRef(element);
    cachedThreshold = threshold;
    cachedOverrideShouldTestInside = overrideShouldTestInside;
    cachedHit = result;
    return result;
};
exports.hitElementItself = hitElementItself;
const isPointInRotatedBounds = (point, bounds, angle, tolerance = 0) => {
    const adjustedPoint = angle === 0
        ? point
        : (0, math_1.pointRotateRads)(point, (0, bounds_1.getCenterForBounds)(bounds), -angle);
    return (0, math_1.isPointWithinBounds)((0, math_1.pointFrom)(bounds[0] - tolerance, bounds[1] - tolerance), adjustedPoint, (0, math_1.pointFrom)(bounds[2] + tolerance, bounds[3] + tolerance));
};
const hitElementBoundingBox = (point, element, elementsMap, tolerance = 0) => {
    const bounds = (0, bounds_1.getElementBounds)(element, elementsMap, true);
    return isPointInRotatedBounds(point, bounds, element.angle, tolerance);
};
exports.hitElementBoundingBox = hitElementBoundingBox;
const hitElementBoundingBoxOnly = (hitArgs, elementsMap) => !(0, exports.hitElementItself)(hitArgs) &&
    // bound text is considered part of the element (even if it's outside the bounding box)
    !(0, exports.hitElementBoundText)(hitArgs.point, hitArgs.element, elementsMap) &&
    (0, exports.hitElementBoundingBox)(hitArgs.point, hitArgs.element, elementsMap);
exports.hitElementBoundingBoxOnly = hitElementBoundingBoxOnly;
const hitElementBoundText = (point, element, elementsMap) => {
    const boundTextElementCandidate = (0, textElement_1.getBoundTextElement)(element, elementsMap);
    if (!boundTextElementCandidate) {
        return false;
    }
    const boundTextElement = (0, typeChecks_1.isLinearElement)(element)
        ? {
            ...boundTextElementCandidate,
            // arrow's bound text accurate position is not stored in the element's property
            // but rather calculated and returned from the following static method
            ...linearElementEditor_1.LinearElementEditor.getBoundTextElementPosition(element, boundTextElementCandidate, elementsMap),
        }
        : boundTextElementCandidate;
    return (0, exports.isPointInElement)(point, boundTextElement, elementsMap);
};
exports.hitElementBoundText = hitElementBoundText;
const bindingBorderTest = (element, [x, y], elementsMap, tolerance = 0) => {
    const p = (0, math_1.pointFrom)(x, y);
    const shouldTestInside = 
    // disable fullshape snapping for frame elements so we
    // can bind to frame children
    !(0, typeChecks_1.isFrameLikeElement)(element);
    // PERF: Run a cheap test to see if the binding element
    // is even close to the element
    const t = Math.max(1, tolerance);
    const bounds = [x - t, y - t, x + t, y + t];
    const elementBounds = (0, bounds_1.getElementBounds)(element, elementsMap);
    if (!(0, bounds_1.doBoundsIntersect)(bounds, elementBounds)) {
        return false;
    }
    // If the element is inside a frame, we should clip the element
    if (element.frameId) {
        const enclosingFrame = elementsMap.get(element.frameId);
        if (enclosingFrame && (0, typeChecks_1.isFrameLikeElement)(enclosingFrame)) {
            const enclosingFrameBounds = (0, bounds_1.getElementBounds)(enclosingFrame, elementsMap);
            if (!(0, bounds_1.pointInsideBounds)(p, enclosingFrameBounds)) {
                return false;
            }
        }
    }
    // Do the intersection test against the element since it's close enough
    const intersections = (0, exports.intersectElementWithLineSegment)(element, elementsMap, (0, math_1.lineSegment)((0, bounds_1.elementCenterPoint)(element, elementsMap), p));
    const distance = (0, distance_1.distanceToElement)(element, elementsMap, p);
    return shouldTestInside
        ? intersections.length === 0 || distance <= tolerance
        : intersections.length > 0 && distance <= t;
};
const getAllHoveredElementAtPoint = (point, elements, elementsMap, tolerance) => {
    const candidateElements = [];
    // We need to to hit testing from front (end of the array) to back (beginning of the array)
    // because array is ordered from lower z-index to highest and we want element z-index
    // with higher z-index
    for (let index = elements.length - 1; index >= 0; --index) {
        const element = elements[index];
        (0, common_1.invariant)(!element.isDeleted, "Elements in the function parameter for getAllElementsAtPositionForBinding() should not contain deleted elements");
        if ((0, typeChecks_1.isBindableElement)(element, false) &&
            bindingBorderTest(element, point, elementsMap, tolerance)) {
            candidateElements.push(element);
            if (!(0, common_1.isTransparent)(element.backgroundColor)) {
                break;
            }
        }
    }
    return candidateElements;
};
exports.getAllHoveredElementAtPoint = getAllHoveredElementAtPoint;
const getHoveredElementForBinding = (point, elements, elementsMap, tolerance) => {
    const candidateElements = (0, exports.getAllHoveredElementAtPoint)(point, elements, elementsMap, tolerance);
    if (!candidateElements || candidateElements.length === 0) {
        return null;
    }
    if (candidateElements.length === 1) {
        return candidateElements[0];
    }
    // Prefer smaller shapes
    return candidateElements
        .sort((a, b) => b.width ** 2 + b.height ** 2 - (a.width ** 2 + a.height ** 2))
        .pop();
};
exports.getHoveredElementForBinding = getHoveredElementForBinding;
const getHoveredElementForFocusPoint = (point, arrow, elements, elementsMap, tolerance) => {
    const candidateElements = [];
    // We need to to hit testing from front (end of the array) to back (beginning of the array)
    // because array is ordered from lower z-index to highest and we want element z-index
    // with higher z-index
    for (let index = elements.length - 1; index >= 0; --index) {
        const element = elements[index];
        (0, common_1.invariant)(!element.isDeleted, "Elements in the function parameter for getAllElementsAtPositionForBinding() should not contain deleted elements");
        if ((0, typeChecks_1.isBindableElement)(element, false) &&
            bindingBorderTest(element, point, elementsMap, tolerance)) {
            candidateElements.push(element);
        }
    }
    if (!candidateElements || candidateElements.length === 0) {
        return null;
    }
    if (candidateElements.length === 1) {
        return candidateElements[0];
    }
    const distanceFilteredCandidateElements = candidateElements
        // Resolve by distance
        .filter((el) => (0, distance_1.distanceToElement)(el, elementsMap, point) <= (0, binding_1.getBindingGap)(el, arrow) ||
        (0, exports.isPointInElement)(point, el, elementsMap));
    if (distanceFilteredCandidateElements.length === 0) {
        return null;
    }
    return distanceFilteredCandidateElements[0];
};
exports.getHoveredElementForFocusPoint = getHoveredElementForFocusPoint;
/**
 * Intersect a line with an element for binding test
 *
 * @param element
 * @param line
 * @param offset
 * @returns
 */
const intersectElementWithLineSegment = (element, elementsMap, line, offset = 0, onlyFirst = false) => {
    // First check if the line intersects the element's axis-aligned bounding box
    // as it is much faster than checking intersection against the element's shape
    const intersectorBounds = [
        Math.min(line[0][0] - offset, line[1][0] - offset),
        Math.min(line[0][1] - offset, line[1][1] - offset),
        Math.max(line[0][0] + offset, line[1][0] + offset),
        Math.max(line[0][1] + offset, line[1][1] + offset),
    ];
    const elementBounds = (0, bounds_1.getElementBounds)(element, elementsMap);
    if (!(0, bounds_1.doBoundsIntersect)(intersectorBounds, elementBounds)) {
        return [];
    }
    // Do the actual intersection test against the element's shape
    switch (element.type) {
        case "rectangle":
        case "image":
        case "text":
        case "iframe":
        case "embeddable":
        case "frame":
        case "selection":
        case "magicframe":
            return intersectRectanguloidWithLineSegment(element, elementsMap, line, offset, onlyFirst);
        case "diamond":
            return intersectDiamondWithLineSegment(element, elementsMap, line, offset, onlyFirst);
        case "ellipse":
            return intersectEllipseWithLineSegment(element, elementsMap, line, offset);
        case "line":
        case "freedraw":
        case "arrow":
            return intersectLinearOrFreeDrawWithLineSegment(element, line, elementsMap, onlyFirst);
    }
};
exports.intersectElementWithLineSegment = intersectElementWithLineSegment;
const curveIntersections = (curves, segment, intersections, center, angle, onlyFirst = false) => {
    for (const c of curves) {
        // Optimize by doing a cheap bounding box check first
        const b1 = (0, bounds_1.getCubicBezierCurveBound)(c[0], c[1], c[2], c[3]);
        const b2 = [
            Math.min(segment[0][0], segment[1][0]),
            Math.min(segment[0][1], segment[1][1]),
            Math.max(segment[0][0], segment[1][0]),
            Math.max(segment[0][1], segment[1][1]),
        ];
        if (!(0, bounds_1.doBoundsIntersect)(b1, b2)) {
            continue;
        }
        const hits = (0, math_1.curveIntersectLineSegment)(c, segment);
        if (hits.length > 0) {
            for (const j of hits) {
                intersections.push((0, math_1.pointRotateRads)(j, center, angle));
            }
            if (onlyFirst) {
                return intersections;
            }
        }
    }
    return intersections;
};
const lineIntersections = (lines, segment, intersections, center, angle, onlyFirst = false) => {
    for (const l of lines) {
        const intersection = (0, math_1.lineSegmentIntersectionPoints)(l, segment);
        if (intersection) {
            intersections.push((0, math_1.pointRotateRads)(intersection, center, angle));
            if (onlyFirst) {
                return intersections;
            }
        }
    }
    return intersections;
};
const intersectLinearOrFreeDrawWithLineSegment = (element, segment, elementsMap, onlyFirst = false) => {
    // NOTE: This is the only one which return the decomposed elements
    // rotated! This is due to taking advantage of roughjs definitions.
    const [lines, curves] = (0, utils_2.deconstructLinearOrFreeDrawElement)(element, elementsMap);
    const intersections = [];
    for (const l of lines) {
        const intersection = (0, math_1.lineSegmentIntersectionPoints)(l, segment);
        if (intersection) {
            intersections.push(intersection);
            if (onlyFirst) {
                return intersections;
            }
        }
    }
    for (const c of curves) {
        // Optimize by doing a cheap bounding box check first
        const b1 = (0, bounds_1.getCubicBezierCurveBound)(c[0], c[1], c[2], c[3]);
        const b2 = [
            Math.min(segment[0][0], segment[1][0]),
            Math.min(segment[0][1], segment[1][1]),
            Math.max(segment[0][0], segment[1][0]),
            Math.max(segment[0][1], segment[1][1]),
        ];
        if (!(0, bounds_1.doBoundsIntersect)(b1, b2)) {
            continue;
        }
        const hits = (0, math_1.curveIntersectLineSegment)(c, segment, {
            iterLimit: 10,
        });
        if (hits.length > 0) {
            intersections.push(...hits);
            if (onlyFirst) {
                return intersections;
            }
        }
    }
    return intersections;
};
const intersectRectanguloidWithLineSegment = (element, elementsMap, segment, offset = 0, onlyFirst = false) => {
    const center = (0, bounds_1.elementCenterPoint)(element, elementsMap);
    // To emulate a rotated rectangle we rotate the point in the inverse angle
    // instead. It's all the same distance-wise.
    const rotatedA = (0, math_1.pointRotateRads)(segment[0], center, -element.angle);
    const rotatedB = (0, math_1.pointRotateRads)(segment[1], center, -element.angle);
    const rotatedIntersector = (0, math_1.lineSegment)(rotatedA, rotatedB);
    // Get the element's building components we can test against
    const [sides, corners] = (0, utils_2.deconstructRectanguloidElement)(element, offset);
    const intersections = [];
    lineIntersections(sides, rotatedIntersector, intersections, center, element.angle, onlyFirst);
    if (onlyFirst && intersections.length > 0) {
        return intersections;
    }
    curveIntersections(corners, rotatedIntersector, intersections, center, element.angle, onlyFirst);
    return intersections;
};
/**
 *
 * @param element
 * @param a
 * @param b
 * @returns
 */
const intersectDiamondWithLineSegment = (element, elementsMap, l, offset = 0, onlyFirst = false) => {
    const center = (0, bounds_1.elementCenterPoint)(element, elementsMap);
    // Rotate the point to the inverse direction to simulate the rotated diamond
    // points. It's all the same distance-wise.
    const rotatedA = (0, math_1.pointRotateRads)(l[0], center, -element.angle);
    const rotatedB = (0, math_1.pointRotateRads)(l[1], center, -element.angle);
    const rotatedIntersector = (0, math_1.lineSegment)(rotatedA, rotatedB);
    const [sides, corners] = (0, utils_2.deconstructDiamondElement)(element, offset);
    const intersections = [];
    lineIntersections(sides, rotatedIntersector, intersections, center, element.angle, onlyFirst);
    if (onlyFirst && intersections.length > 0) {
        return intersections;
    }
    curveIntersections(corners, rotatedIntersector, intersections, center, element.angle, onlyFirst);
    return intersections;
};
/**
 *
 * @param element
 * @param a
 * @param b
 * @returns
 */
const intersectEllipseWithLineSegment = (element, elementsMap, l, offset = 0) => {
    const center = (0, bounds_1.elementCenterPoint)(element, elementsMap);
    const rotatedA = (0, math_1.pointRotateRads)(l[0], center, -element.angle);
    const rotatedB = (0, math_1.pointRotateRads)(l[1], center, -element.angle);
    return (0, ellipse_1.ellipseSegmentInterceptPoints)((0, ellipse_1.ellipse)(center, element.width / 2 + offset, element.height / 2 + offset), (0, math_1.lineSegment)(rotatedA, rotatedB)).map((p) => (0, math_1.pointRotateRads)(p, center, element.angle));
};
/**
 * Check if the given point is considered on the given shape's border
 *
 * @param point
 * @param element
 * @param tolerance
 * @returns
 */
const isPointOnElementOutline = (point, element, elementsMap, tolerance = 1) => (0, distance_1.distanceToElement)(element, elementsMap, point) <= tolerance;
/**
 * Check if the given point is considered inside the element's border
 *
 * @param point
 * @param element
 * @returns
 */
const isPointInElement = (point, element, elementsMap) => {
    if (((0, typeChecks_1.isLinearElement)(element) || (0, typeChecks_1.isFreeDrawElement)(element)) &&
        !(0, utils_1.isPathALoop)(element.points)) {
        // There isn't any "inside" for a non-looping path
        return false;
    }
    const [x1, y1, x2, y2] = (0, bounds_1.getElementBounds)(element, elementsMap);
    if (!(0, math_1.isPointWithinBounds)((0, math_1.pointFrom)(x1, y1), point, (0, math_1.pointFrom)(x2, y2))) {
        return false;
    }
    const center = (0, math_1.pointFrom)((x1 + x2) / 2, (y1 + y2) / 2);
    const otherPoint = (0, math_1.pointFromVector)((0, math_1.vectorScale)((0, math_1.vectorNormalize)((0, math_1.vectorFromPoint)(point, center, 0.1)), Math.max(element.width, element.height) * 2), center);
    const intersector = (0, math_1.lineSegment)(point, otherPoint);
    const intersections = (0, exports.intersectElementWithLineSegment)(element, elementsMap, intersector).filter((p, pos, arr) => arr.findIndex((q) => (0, math_1.pointsEqual)(q, p)) === pos);
    return intersections.length % 2 === 1;
};
exports.isPointInElement = isPointInElement;
const isBindableElementInsideOtherBindable = (innerElement, outerElement, elementsMap) => {
    // Get corner points of the inner element based on its type
    const getCornerPoints = (element, offset) => {
        const { x, y, width, height, angle } = element;
        const center = (0, bounds_1.elementCenterPoint)(element, elementsMap);
        if (element.type === "diamond") {
            // Diamond has 4 corner points at the middle of each side
            const [topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY] = (0, bounds_1.getDiamondPoints)(element);
            const corners = [
                (0, math_1.pointFrom)(x + topX, y + topY - offset), // top
                (0, math_1.pointFrom)(x + rightX + offset, y + rightY), // right
                (0, math_1.pointFrom)(x + bottomX, y + bottomY + offset), // bottom
                (0, math_1.pointFrom)(x + leftX - offset, y + leftY), // left
            ];
            return corners.map((corner) => (0, math_1.pointRotateRads)(corner, center, angle));
        }
        if (element.type === "ellipse") {
            // For ellipse, test points at the extremes (top, right, bottom, left)
            const cx = x + width / 2;
            const cy = y + height / 2;
            const rx = width / 2;
            const ry = height / 2;
            const corners = [
                (0, math_1.pointFrom)(cx, cy - ry - offset), // top
                (0, math_1.pointFrom)(cx + rx + offset, cy), // right
                (0, math_1.pointFrom)(cx, cy + ry + offset), // bottom
                (0, math_1.pointFrom)(cx - rx - offset, cy), // left
            ];
            return corners.map((corner) => (0, math_1.pointRotateRads)(corner, center, angle));
        }
        // Rectangle and other rectangular shapes (image, text, etc.)
        const corners = [
            (0, math_1.pointFrom)(x - offset, y - offset), // top-left
            (0, math_1.pointFrom)(x + width + offset, y - offset), // top-right
            (0, math_1.pointFrom)(x + width + offset, y + height + offset), // bottom-right
            (0, math_1.pointFrom)(x - offset, y + height + offset), // bottom-left
        ];
        return corners.map((corner) => (0, math_1.pointRotateRads)(corner, center, angle));
    };
    const offset = (-1 * Math.max(innerElement.width, innerElement.height)) / 20; // 5% offset
    const innerCorners = getCornerPoints(innerElement, offset);
    // Check if all corner points of the inner element are inside the outer element
    return innerCorners.every((corner) => (0, exports.isPointInElement)(corner, outerElement, elementsMap));
};
exports.isBindableElementInsideOtherBindable = isBindableElementInsideOtherBindable;
