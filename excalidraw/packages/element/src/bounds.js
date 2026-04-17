"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.elementCenterPoint = exports.boundsContainBounds = exports.doBoundsIntersect = exports.pointInsideBoundsInclusive = exports.pointInsideBounds = exports.aabbForElement = exports.getCenterForBounds = exports.getVisibleSceneBounds = exports.getCommonBoundingBox = exports.getClosestElementBounds = exports.getElementPointsCoords = exports.getResizedElementAbsoluteCoords = exports.getDraggedElementsBounds = exports.getCommonBounds = exports.getElementBounds = exports.getArrowheadPoints = exports.getArrowheadAngle = exports.getArrowheadSize = exports.getBoundsFromPoints = exports.getMinMaxXYFromCurvePathOps = exports.getCubicBezierCurveBound = exports.getDiamondPoints = exports.getRectangleBoxAbsoluteCoords = exports.getElementLineSegments = exports.getElementAbsoluteCoords = exports.ElementBounds = void 0;
const rough_1 = __importDefault(require("roughjs/bin/rough"));
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const shape_1 = require("@excalidraw/utils/shape");
const points_on_curve_1 = require("points-on-curve");
const shape_2 = require("./shape");
const shape_3 = require("./shape");
const linearElementEditor_1 = require("./linearElementEditor");
const textElement_1 = require("./textElement");
const typeChecks_1 = require("./typeChecks");
const shape_4 = require("./shape");
const utils_1 = require("./utils");
class ElementBounds {
    static boundsCache = new WeakMap();
    static nonRotatedBoundsCache = new WeakMap();
    static getBounds(element, elementsMap, nonRotated = false) {
        const cachedBounds = nonRotated && element.angle !== 0
            ? ElementBounds.nonRotatedBoundsCache.get(element)
            : ElementBounds.boundsCache.get(element);
        if (cachedBounds?.version &&
            cachedBounds.version === element.version &&
            // we don't invalidate cache when we update containers and not labels,
            // which is causing problems down the line. Fix TBA.
            !(0, typeChecks_1.isBoundToContainer)(element)) {
            return cachedBounds.bounds;
        }
        if (nonRotated && element.angle !== 0) {
            const nonRotatedBounds = ElementBounds.calculateBounds({
                ...element,
                angle: 0,
            }, elementsMap);
            ElementBounds.nonRotatedBoundsCache.set(element, {
                version: element.version,
                bounds: nonRotatedBounds,
            });
            return nonRotatedBounds;
        }
        const bounds = ElementBounds.calculateBounds(element, elementsMap);
        ElementBounds.boundsCache.set(element, {
            version: element.version,
            bounds,
        });
        return bounds;
    }
    static calculateBounds(element, elementsMap) {
        let bounds;
        const [x1, y1, x2, y2, cx, cy] = (0, exports.getElementAbsoluteCoords)(element, elementsMap);
        if ((0, typeChecks_1.isFreeDrawElement)(element)) {
            const [minX, minY, maxX, maxY] = (0, exports.getBoundsFromPoints)(element.points.map(([x, y]) => (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x, y), (0, math_1.pointFrom)(cx - element.x, cy - element.y), element.angle)));
            return [
                minX + element.x,
                minY + element.y,
                maxX + element.x,
                maxY + element.y,
            ];
        }
        else if ((0, typeChecks_1.isLinearElement)(element)) {
            bounds = getLinearElementRotatedBounds(element, cx, cy, elementsMap);
        }
        else if (element.type === "diamond") {
            const [x11, y11] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(cx, y1), (0, math_1.pointFrom)(cx, cy), element.angle);
            const [x12, y12] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(cx, y2), (0, math_1.pointFrom)(cx, cy), element.angle);
            const [x22, y22] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x1, cy), (0, math_1.pointFrom)(cx, cy), element.angle);
            const [x21, y21] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x2, cy), (0, math_1.pointFrom)(cx, cy), element.angle);
            const minX = Math.min(x11, x12, x22, x21);
            const minY = Math.min(y11, y12, y22, y21);
            const maxX = Math.max(x11, x12, x22, x21);
            const maxY = Math.max(y11, y12, y22, y21);
            bounds = [minX, minY, maxX, maxY];
        }
        else if (element.type === "ellipse") {
            const w = (x2 - x1) / 2;
            const h = (y2 - y1) / 2;
            const cos = Math.cos(element.angle);
            const sin = Math.sin(element.angle);
            const ww = Math.hypot(w * cos, h * sin);
            const hh = Math.hypot(h * cos, w * sin);
            bounds = [cx - ww, cy - hh, cx + ww, cy + hh];
        }
        else {
            const [x11, y11] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x1, y1), (0, math_1.pointFrom)(cx, cy), element.angle);
            const [x12, y12] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x1, y2), (0, math_1.pointFrom)(cx, cy), element.angle);
            const [x22, y22] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x2, y2), (0, math_1.pointFrom)(cx, cy), element.angle);
            const [x21, y21] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x2, y1), (0, math_1.pointFrom)(cx, cy), element.angle);
            const minX = Math.min(x11, x12, x22, x21);
            const minY = Math.min(y11, y12, y22, y21);
            const maxX = Math.max(x11, x12, x22, x21);
            const maxY = Math.max(y11, y12, y22, y21);
            bounds = [minX, minY, maxX, maxY];
        }
        return bounds;
    }
}
exports.ElementBounds = ElementBounds;
// Scene -> Scene coords, but in x1,x2,y1,y2 format.
//
// If the element is created from right to left, the width is going to be negative
// This set of functions retrieves the absolute position of the 4 points.
const getElementAbsoluteCoords = (element, elementsMap, includeBoundText = false) => {
    if ((0, typeChecks_1.isFreeDrawElement)(element)) {
        return getFreeDrawElementAbsoluteCoords(element);
    }
    else if ((0, typeChecks_1.isLinearElement)(element)) {
        return linearElementEditor_1.LinearElementEditor.getElementAbsoluteCoords(element, elementsMap, includeBoundText);
    }
    else if ((0, typeChecks_1.isTextElement)(element)) {
        const container = elementsMap
            ? (0, textElement_1.getContainerElement)(element, elementsMap)
            : null;
        if ((0, typeChecks_1.isArrowElement)(container)) {
            const { x, y } = linearElementEditor_1.LinearElementEditor.getBoundTextElementPosition(container, element, elementsMap);
            return [
                x,
                y,
                x + element.width,
                y + element.height,
                x + element.width / 2,
                y + element.height / 2,
            ];
        }
    }
    return [
        element.x,
        element.y,
        element.x + element.width,
        element.y + element.height,
        element.x + element.width / 2,
        element.y + element.height / 2,
    ];
};
exports.getElementAbsoluteCoords = getElementAbsoluteCoords;
/*
 * for a given element, `getElementLineSegments` returns line segments
 * that can be used for visual collision detection (useful for frames)
 * as opposed to bounding box collision detection
 */
/**
 * Given an element, return the line segments that make up the element.
 *
 * Uses helpers from /math
 */
const getElementLineSegments = (element, elementsMap) => {
    const shape = (0, shape_4.getElementShape)(element, elementsMap);
    const [x1, y1, x2, y2, cx, cy] = (0, exports.getElementAbsoluteCoords)(element, elementsMap);
    const center = (0, math_1.pointFrom)(cx, cy);
    if (shape.type === "polycurve") {
        const curves = shape.data;
        const pointsOnCurves = curves.map((curve) => (0, points_on_curve_1.pointsOnBezierCurves)(curve, 10));
        const segments = [];
        if (((0, typeChecks_1.isLineElement)(element) && !element.polygon) ||
            (0, typeChecks_1.isArrowElement)(element)) {
            for (const points of pointsOnCurves) {
                let i = 0;
                while (i < points.length - 1) {
                    segments.push((0, math_1.lineSegment)((0, math_1.pointFrom)(points[i][0], points[i][1]), (0, math_1.pointFrom)(points[i + 1][0], points[i + 1][1])));
                    i++;
                }
            }
        }
        else {
            const points = pointsOnCurves.flat();
            let i = 0;
            while (i < points.length - 1) {
                segments.push((0, math_1.lineSegment)((0, math_1.pointFrom)(points[i][0], points[i][1]), (0, math_1.pointFrom)(points[i + 1][0], points[i + 1][1])));
                i++;
            }
        }
        return segments;
    }
    else if (shape.type === "polyline") {
        return shape.data;
    }
    else if (_isRectanguloidElement(element)) {
        const [sides, corners] = (0, utils_1.deconstructRectanguloidElement)(element);
        const cornerSegments = corners
            .map((corner) => getSegmentsOnCurve(corner, center, element.angle))
            .flat();
        const rotatedSides = getRotatedSides(sides, center, element.angle);
        return [...rotatedSides, ...cornerSegments];
    }
    else if (element.type === "diamond") {
        const [sides, corners] = (0, utils_1.deconstructDiamondElement)(element);
        const cornerSegments = corners
            .map((corner) => getSegmentsOnCurve(corner, center, element.angle))
            .flat();
        const rotatedSides = getRotatedSides(sides, center, element.angle);
        return [...rotatedSides, ...cornerSegments];
    }
    else if (shape.type === "polygon") {
        if ((0, typeChecks_1.isTextElement)(element)) {
            const container = (0, textElement_1.getContainerElement)(element, elementsMap);
            if (container && (0, typeChecks_1.isLinearElement)(container)) {
                const segments = [
                    (0, math_1.lineSegment)((0, math_1.pointFrom)(x1, y1), (0, math_1.pointFrom)(x2, y1)),
                    (0, math_1.lineSegment)((0, math_1.pointFrom)(x2, y1), (0, math_1.pointFrom)(x2, y2)),
                    (0, math_1.lineSegment)((0, math_1.pointFrom)(x2, y2), (0, math_1.pointFrom)(x1, y2)),
                    (0, math_1.lineSegment)((0, math_1.pointFrom)(x1, y2), (0, math_1.pointFrom)(x1, y1)),
                ];
                return segments;
            }
        }
        const points = shape.data;
        const segments = [];
        for (let i = 0; i < points.length - 1; i++) {
            segments.push((0, math_1.lineSegment)(points[i], points[i + 1]));
        }
        return segments;
    }
    else if (shape.type === "ellipse") {
        return getSegmentsOnEllipse(element);
    }
    const [nw, ne, sw, se, , , w, e] = [
        [x1, y1],
        [x2, y1],
        [x1, y2],
        [x2, y2],
        [cx, y1],
        [cx, y2],
        [x1, cy],
        [x2, cy],
    ].map((point) => (0, math_1.pointRotateRads)(point, center, element.angle));
    return [
        (0, math_1.lineSegment)(nw, ne),
        (0, math_1.lineSegment)(sw, se),
        (0, math_1.lineSegment)(nw, sw),
        (0, math_1.lineSegment)(ne, se),
        (0, math_1.lineSegment)(nw, e),
        (0, math_1.lineSegment)(sw, e),
        (0, math_1.lineSegment)(ne, w),
        (0, math_1.lineSegment)(se, w),
    ];
};
exports.getElementLineSegments = getElementLineSegments;
const _isRectanguloidElement = (element) => {
    return (element != null &&
        (element.type === "rectangle" ||
            element.type === "image" ||
            element.type === "iframe" ||
            element.type === "embeddable" ||
            element.type === "frame" ||
            element.type === "magicframe" ||
            (element.type === "text" && !element.containerId)));
};
const getRotatedSides = (sides, center, angle) => {
    return sides.map((side) => {
        return (0, math_1.lineSegment)((0, math_1.pointRotateRads)(side[0], center, angle), (0, math_1.pointRotateRads)(side[1], center, angle));
    });
};
const getSegmentsOnCurve = (curve, center, angle) => {
    const points = (0, points_on_curve_1.pointsOnBezierCurves)(curve, 10);
    let i = 0;
    const segments = [];
    while (i < points.length - 1) {
        segments.push((0, math_1.lineSegment)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(points[i][0], points[i][1]), center, angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(points[i + 1][0], points[i + 1][1]), center, angle)));
        i++;
    }
    return segments;
};
const getSegmentsOnEllipse = (ellipse) => {
    const center = (0, math_1.pointFrom)(ellipse.x + ellipse.width / 2, ellipse.y + ellipse.height / 2);
    const a = ellipse.width / 2;
    const b = ellipse.height / 2;
    const segments = [];
    const points = [];
    const n = 90;
    const deltaT = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++) {
        const t = i * deltaT;
        const x = center[0] + a * Math.cos(t);
        const y = center[1] + b * Math.sin(t);
        points.push((0, math_1.pointRotateRads)((0, math_1.pointFrom)(x, y), center, ellipse.angle));
    }
    for (let i = 0; i < points.length - 1; i++) {
        segments.push((0, math_1.lineSegment)(points[i], points[i + 1]));
    }
    segments.push((0, math_1.lineSegment)(points[points.length - 1], points[0]));
    return segments;
};
/**
 * Scene -> Scene coords, but in x1,x2,y1,y2 format.
 *
 * Rectangle here means any rectangular frame, not an excalidraw element.
 */
const getRectangleBoxAbsoluteCoords = (boxSceneCoords) => {
    return [
        boxSceneCoords.x,
        boxSceneCoords.y,
        boxSceneCoords.x + boxSceneCoords.width,
        boxSceneCoords.y + boxSceneCoords.height,
        boxSceneCoords.x + boxSceneCoords.width / 2,
        boxSceneCoords.y + boxSceneCoords.height / 2,
    ];
};
exports.getRectangleBoxAbsoluteCoords = getRectangleBoxAbsoluteCoords;
const getDiamondPoints = (element) => {
    // Here we add +1 to avoid these numbers to be 0
    // otherwise rough.js will throw an error complaining about it
    const topX = Math.floor(element.width / 2) + 1;
    const topY = 0;
    const rightX = element.width;
    const rightY = Math.floor(element.height / 2) + 1;
    const bottomX = topX;
    const bottomY = element.height;
    const leftX = 0;
    const leftY = rightY;
    return [topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY];
};
exports.getDiamondPoints = getDiamondPoints;
// reference: https://eliot-jones.com/2019/12/cubic-bezier-curve-bounding-boxes
const getBezierValueForT = (t, p0, p1, p2, p3) => {
    const oneMinusT = 1 - t;
    return (Math.pow(oneMinusT, 3) * p0 +
        3 * Math.pow(oneMinusT, 2) * t * p1 +
        3 * oneMinusT * Math.pow(t, 2) * p2 +
        Math.pow(t, 3) * p3);
};
const solveQuadratic = (p0, p1, p2, p3) => {
    const i = p1 - p0;
    const j = p2 - p1;
    const k = p3 - p2;
    const a = 3 * i - 6 * j + 3 * k;
    const b = 6 * j - 6 * i;
    const c = 3 * i;
    const sqrtPart = b * b - 4 * a * c;
    const hasSolution = sqrtPart >= 0;
    if (!hasSolution) {
        return false;
    }
    let s1 = null;
    let s2 = null;
    let t1 = Infinity;
    let t2 = Infinity;
    if (a === 0) {
        t1 = t2 = -c / b;
    }
    else {
        t1 = (-b + Math.sqrt(sqrtPart)) / (2 * a);
        t2 = (-b - Math.sqrt(sqrtPart)) / (2 * a);
    }
    if (t1 >= 0 && t1 <= 1) {
        s1 = getBezierValueForT(t1, p0, p1, p2, p3);
    }
    if (t2 >= 0 && t2 <= 1) {
        s2 = getBezierValueForT(t2, p0, p1, p2, p3);
    }
    return [s1, s2];
};
const getCubicBezierCurveBound = (p0, p1, p2, p3) => {
    const solX = solveQuadratic(p0[0], p1[0], p2[0], p3[0]);
    const solY = solveQuadratic(p0[1], p1[1], p2[1], p3[1]);
    let minX = Math.min(p0[0], p3[0]);
    let maxX = Math.max(p0[0], p3[0]);
    if (solX) {
        const xs = solX.filter((x) => x !== null);
        minX = Math.min(minX, ...xs);
        maxX = Math.max(maxX, ...xs);
    }
    let minY = Math.min(p0[1], p3[1]);
    let maxY = Math.max(p0[1], p3[1]);
    if (solY) {
        const ys = solY.filter((y) => y !== null);
        minY = Math.min(minY, ...ys);
        maxY = Math.max(maxY, ...ys);
    }
    return [minX, minY, maxX, maxY];
};
exports.getCubicBezierCurveBound = getCubicBezierCurveBound;
const getMinMaxXYFromCurvePathOps = (ops, transformXY) => {
    let currentP = (0, math_1.pointFrom)(0, 0);
    const { minX, minY, maxX, maxY } = ops.reduce((limits, { op, data }) => {
        // There are only four operation types:
        // move, bcurveTo, lineTo, and curveTo
        if (op === "move") {
            // change starting point
            const p = (0, math_1.pointFromArray)(data);
            (0, common_1.invariant)(p != null, "Op data is not a point");
            currentP = p;
            // move operation does not draw anything; so, it always
            // returns false
        }
        else if (op === "bcurveTo") {
            const _p1 = (0, math_1.pointFrom)(data[0], data[1]);
            const _p2 = (0, math_1.pointFrom)(data[2], data[3]);
            const _p3 = (0, math_1.pointFrom)(data[4], data[5]);
            const p1 = transformXY ? transformXY(_p1) : _p1;
            const p2 = transformXY ? transformXY(_p2) : _p2;
            const p3 = transformXY ? transformXY(_p3) : _p3;
            const p0 = transformXY ? transformXY(currentP) : currentP;
            currentP = _p3;
            const [minX, minY, maxX, maxY] = (0, exports.getCubicBezierCurveBound)(p0, p1, p2, p3);
            limits.minX = Math.min(limits.minX, minX);
            limits.minY = Math.min(limits.minY, minY);
            limits.maxX = Math.max(limits.maxX, maxX);
            limits.maxY = Math.max(limits.maxY, maxY);
        }
        else if (op === "lineTo") {
            // TODO: Implement this
        }
        else if (op === "qcurveTo") {
            // TODO: Implement this
        }
        return limits;
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    return [minX, minY, maxX, maxY];
};
exports.getMinMaxXYFromCurvePathOps = getMinMaxXYFromCurvePathOps;
const getBoundsFromPoints = (points, padding = 0) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of points) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }
    return [minX - padding, minY - padding, maxX + padding, maxY + padding];
};
exports.getBoundsFromPoints = getBoundsFromPoints;
const getFreeDrawElementAbsoluteCoords = (element) => {
    const [minX, minY, maxX, maxY] = (0, exports.getBoundsFromPoints)(element.points);
    const x1 = minX + element.x;
    const y1 = minY + element.y;
    const x2 = maxX + element.x;
    const y2 = maxY + element.y;
    return [x1, y1, x2, y2, (x1 + x2) / 2, (y1 + y2) / 2];
};
const CARDINALITY_MARKER_SIZE = 20;
const CROWFOOT_ARROWHEAD_SIZE = 15;
/** @returns number in pixels */
const getArrowheadSize = (arrowhead) => {
    switch (arrowhead) {
        case "arrow":
            return 25;
        case "diamond":
        case "diamond_outline":
            return 12;
        case "cardinality_many":
        case "cardinality_one_or_many":
        case "cardinality_zero_or_many":
            return CROWFOOT_ARROWHEAD_SIZE;
        case "cardinality_one":
        case "cardinality_exactly_one":
        case "cardinality_zero_or_one":
            return CARDINALITY_MARKER_SIZE;
        default:
            return 15;
    }
};
exports.getArrowheadSize = getArrowheadSize;
/** @returns number in degrees */
const getArrowheadAngle = (arrowhead) => {
    switch (arrowhead) {
        case "bar":
            return 90;
        case "arrow":
            return 20;
        default:
            return 25;
    }
};
exports.getArrowheadAngle = getArrowheadAngle;
const getArrowheadPoints = (element, shape, position, arrowhead, offsetMultiplier = 0) => {
    if (arrowhead === null) {
        return null;
    }
    if (shape.length < 1) {
        return null;
    }
    const ops = (0, shape_1.getCurvePathOps)(shape[0]);
    if (ops.length < 1) {
        return null;
    }
    // The index of the bCurve operation to examine.
    const index = position === "start" ? 1 : ops.length - 1;
    const data = ops[index].data;
    (0, common_1.invariant)(data.length === 6, "Op data length is not 6");
    const p3 = (0, math_1.pointFrom)(data[4], data[5]);
    const p2 = (0, math_1.pointFrom)(data[2], data[3]);
    const p1 = (0, math_1.pointFrom)(data[0], data[1]);
    // We need to find p0 of the bezier curve.
    // It is typically the last point of the previous
    // curve; it can also be the position of moveTo operation.
    const prevOp = ops[index - 1];
    let p0 = (0, math_1.pointFrom)(0, 0);
    if (prevOp.op === "move") {
        const p = (0, math_1.pointFromArray)(prevOp.data);
        (0, common_1.invariant)(p != null, "Op data is not a point");
        p0 = p;
    }
    else if (prevOp.op === "bcurveTo") {
        p0 = (0, math_1.pointFrom)(prevOp.data[4], prevOp.data[5]);
    }
    // B(t) = p0 * (1-t)^3 + 3p1 * t * (1-t)^2 + 3p2 * t^2 * (1-t) + p3 * t^3
    const equation = (t, idx) => Math.pow(1 - t, 3) * p3[idx] +
        3 * t * Math.pow(1 - t, 2) * p2[idx] +
        3 * Math.pow(t, 2) * (1 - t) * p1[idx] +
        p0[idx] * Math.pow(t, 3);
    // Ee know the last point of the arrow (or the first, if start arrowhead).
    const [x2, y2] = position === "start" ? p0 : p3;
    // By using cubic bezier equation (B(t)) and the given parameters,
    // we calculate a point that is closer to the last point.
    // The value 0.3 is chosen arbitrarily and it works best for all
    // the tested cases.
    const [x1, y1] = [equation(0.3, 0), equation(0.3, 1)];
    // Find the normalized direction vector based on the
    // previously calculated points.
    const distance = Math.hypot(x2 - x1, y2 - y1);
    const nx = (x2 - x1) / distance;
    const ny = (y2 - y1) / distance;
    const size = (0, exports.getArrowheadSize)(arrowhead);
    let length = 0;
    {
        // Length for -> arrows is based on the length of the last section
        const [cx, cy] = position === "end"
            ? element.points[element.points.length - 1]
            : element.points[0];
        const [px, py] = element.points.length > 1
            ? position === "end"
                ? element.points[element.points.length - 2]
                : element.points[1]
            : [0, 0];
        length = Math.hypot(cx - px, cy - py);
    }
    // Scale down the arrowhead until we hit a certain size so that it doesn't look weird.
    // This value is selected by minimizing a minimum size with the last segment of the arrowhead
    const lengthMultiplier = arrowhead === "diamond" || arrowhead === "diamond_outline" ? 0.25 : 0.5;
    const minSize = Math.min(size, length * lengthMultiplier);
    const tx = x2 - nx * minSize * offsetMultiplier;
    const ty = y2 - ny * minSize * offsetMultiplier;
    const xs = tx - nx * minSize;
    const ys = ty - ny * minSize;
    if (arrowhead === "circle" || arrowhead === "circle_outline") {
        const diameter = Math.hypot(ys - ty, xs - tx) + element.strokeWidth - 2;
        return [tx, ty, diameter];
    }
    const angle = (0, exports.getArrowheadAngle)(arrowhead);
    if (arrowhead === "cardinality_many" ||
        arrowhead === "cardinality_one_or_many") {
        // swap (xs, ys) with (x2, y2)
        const [x3, y3] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(tx, ty), (0, math_1.pointFrom)(xs, ys), (0, math_1.degreesToRadians)(-angle));
        const [x4, y4] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(tx, ty), (0, math_1.pointFrom)(xs, ys), (0, math_1.degreesToRadians)(angle));
        return [xs, ys, x3, y3, x4, y4];
    }
    // Return points
    const [x3, y3] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(xs, ys), (0, math_1.pointFrom)(tx, ty), ((-angle * Math.PI) / 180));
    const [x4, y4] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(xs, ys), (0, math_1.pointFrom)(tx, ty), (0, math_1.degreesToRadians)(angle));
    if (arrowhead === "diamond" || arrowhead === "diamond_outline") {
        // point opposite to the arrowhead point
        let ox;
        let oy;
        if (position === "start") {
            const [px, py] = element.points.length > 1 ? element.points[1] : [0, 0];
            [ox, oy] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(tx + minSize * 2, ty), (0, math_1.pointFrom)(tx, ty), Math.atan2(py - ty, px - tx));
        }
        else {
            const [px, py] = element.points.length > 1
                ? element.points[element.points.length - 2]
                : [0, 0];
            [ox, oy] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(tx - minSize * 2, ty), (0, math_1.pointFrom)(tx, ty), Math.atan2(ty - py, tx - px));
        }
        return [tx, ty, x3, y3, ox, oy, x4, y4];
    }
    return [tx, ty, x3, y3, x4, y4];
};
exports.getArrowheadPoints = getArrowheadPoints;
// TODO reuse shape.ts
const generateLinearElementShape = (element) => {
    const generator = rough_1.default.generator();
    const options = (0, shape_2.generateRoughOptions)(element);
    const method = (() => {
        if (element.roundness) {
            return "curve";
        }
        if (options.fill) {
            return "polygon";
        }
        return "linearPath";
    })();
    return generator[method](element.points, options);
};
const getLinearElementRotatedBounds = (element, cx, cy, elementsMap) => {
    const boundTextElement = (0, textElement_1.getBoundTextElement)(element, elementsMap);
    if (element.points.length < 2) {
        const [pointX, pointY] = element.points[0];
        const [x, y] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + pointX, element.y + pointY), (0, math_1.pointFrom)(cx, cy), element.angle);
        let coords = [x, y, x, y];
        if (boundTextElement) {
            const coordsWithBoundText = linearElementEditor_1.LinearElementEditor.getMinMaxXYWithBoundText(element, elementsMap, [x, y, x, y], boundTextElement);
            coords = [
                coordsWithBoundText[0],
                coordsWithBoundText[1],
                coordsWithBoundText[2],
                coordsWithBoundText[3],
            ];
        }
        return coords;
    }
    // first element is always the curve
    const cachedShape = shape_3.ShapeCache.get(element, null)?.[0];
    const shape = cachedShape ?? generateLinearElementShape(element);
    const ops = (0, shape_1.getCurvePathOps)(shape);
    const transformXY = ([x, y]) => (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + x, element.y + y), (0, math_1.pointFrom)(cx, cy), element.angle);
    const res = (0, exports.getMinMaxXYFromCurvePathOps)(ops, transformXY);
    let coords = [res[0], res[1], res[2], res[3]];
    if (boundTextElement) {
        const coordsWithBoundText = linearElementEditor_1.LinearElementEditor.getMinMaxXYWithBoundText(element, elementsMap, coords, boundTextElement);
        coords = [
            coordsWithBoundText[0],
            coordsWithBoundText[1],
            coordsWithBoundText[2],
            coordsWithBoundText[3],
        ];
    }
    return coords;
};
const getElementBounds = (element, elementsMap, nonRotated = false) => {
    return ElementBounds.getBounds(element, elementsMap, nonRotated);
};
exports.getElementBounds = getElementBounds;
const getCommonBounds = (elements, elementsMap) => {
    if (!(0, common_1.sizeOf)(elements)) {
        return [0, 0, 0, 0];
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const _elementsMap = elementsMap || (0, common_1.arrayToMap)(elements);
    elements.forEach((element) => {
        const [x1, y1, x2, y2] = (0, exports.getElementBounds)(element, _elementsMap);
        minX = Math.min(minX, x1);
        minY = Math.min(minY, y1);
        maxX = Math.max(maxX, x2);
        maxY = Math.max(maxY, y2);
    });
    return [minX, minY, maxX, maxY];
};
exports.getCommonBounds = getCommonBounds;
const getDraggedElementsBounds = (elements, dragOffset) => {
    const [minX, minY, maxX, maxY] = (0, exports.getCommonBounds)(elements);
    return [
        minX + dragOffset.x,
        minY + dragOffset.y,
        maxX + dragOffset.x,
        maxY + dragOffset.y,
    ];
};
exports.getDraggedElementsBounds = getDraggedElementsBounds;
const getResizedElementAbsoluteCoords = (element, nextWidth, nextHeight, normalizePoints) => {
    if (!((0, typeChecks_1.isLinearElement)(element) || (0, typeChecks_1.isFreeDrawElement)(element))) {
        return [
            element.x,
            element.y,
            element.x + nextWidth,
            element.y + nextHeight,
        ];
    }
    const points = (0, common_1.rescalePoints)(0, nextWidth, (0, common_1.rescalePoints)(1, nextHeight, element.points, normalizePoints), normalizePoints);
    let bounds;
    if ((0, typeChecks_1.isFreeDrawElement)(element)) {
        // Free Draw
        bounds = (0, exports.getBoundsFromPoints)(points);
    }
    else {
        // Line
        const gen = rough_1.default.generator();
        const curve = !element.roundness
            ? gen.linearPath(points, (0, shape_2.generateRoughOptions)(element))
            : gen.curve(points, (0, shape_2.generateRoughOptions)(element));
        const ops = (0, shape_1.getCurvePathOps)(curve);
        bounds = (0, exports.getMinMaxXYFromCurvePathOps)(ops);
    }
    const [minX, minY, maxX, maxY] = bounds;
    return [
        minX + element.x,
        minY + element.y,
        maxX + element.x,
        maxY + element.y,
    ];
};
exports.getResizedElementAbsoluteCoords = getResizedElementAbsoluteCoords;
const getElementPointsCoords = (element, points) => {
    // This might be computationally heavey
    const gen = rough_1.default.generator();
    const curve = element.roundness == null
        ? gen.linearPath(points, (0, shape_2.generateRoughOptions)(element))
        : gen.curve(points, (0, shape_2.generateRoughOptions)(element));
    const ops = (0, shape_1.getCurvePathOps)(curve);
    const [minX, minY, maxX, maxY] = (0, exports.getMinMaxXYFromCurvePathOps)(ops);
    return [
        minX + element.x,
        minY + element.y,
        maxX + element.x,
        maxY + element.y,
    ];
};
exports.getElementPointsCoords = getElementPointsCoords;
const getClosestElementBounds = (elements, from) => {
    if (!elements.length) {
        return [0, 0, 0, 0];
    }
    let minDistance = Infinity;
    let closestElement = elements[0];
    const elementsMap = (0, common_1.arrayToMap)(elements);
    elements.forEach((element) => {
        const [x1, y1, x2, y2] = (0, exports.getElementBounds)(element, elementsMap);
        const distance = (0, math_1.pointDistance)((0, math_1.pointFrom)((x1 + x2) / 2, (y1 + y2) / 2), (0, math_1.pointFrom)(from.x, from.y));
        if (distance < minDistance) {
            minDistance = distance;
            closestElement = element;
        }
    });
    return (0, exports.getElementBounds)(closestElement, elementsMap);
};
exports.getClosestElementBounds = getClosestElementBounds;
const getCommonBoundingBox = (elements) => {
    const [minX, minY, maxX, maxY] = (0, exports.getCommonBounds)(elements);
    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
        midX: (minX + maxX) / 2,
        midY: (minY + maxY) / 2,
    };
};
exports.getCommonBoundingBox = getCommonBoundingBox;
/**
 * returns scene coords of user's editor viewport (visible canvas area) bounds
 */
const getVisibleSceneBounds = ({ scrollX, scrollY, width, height, zoom, }) => {
    return [
        -scrollX,
        -scrollY,
        -scrollX + width / zoom.value,
        -scrollY + height / zoom.value,
    ];
};
exports.getVisibleSceneBounds = getVisibleSceneBounds;
const getCenterForBounds = (bounds) => (0, math_1.pointFrom)(bounds[0] + (bounds[2] - bounds[0]) / 2, bounds[1] + (bounds[3] - bounds[1]) / 2);
exports.getCenterForBounds = getCenterForBounds;
/**
 * Get the axis-aligned bounding box for a given element
 */
const aabbForElement = (element, elementsMap, offset) => {
    const bbox = {
        minX: element.x,
        minY: element.y,
        maxX: element.x + element.width,
        maxY: element.y + element.height,
        midX: element.x + element.width / 2,
        midY: element.y + element.height / 2,
    };
    const center = (0, exports.elementCenterPoint)(element, elementsMap);
    const [topLeftX, topLeftY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bbox.minX, bbox.minY), center, element.angle);
    const [topRightX, topRightY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bbox.maxX, bbox.minY), center, element.angle);
    const [bottomRightX, bottomRightY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bbox.maxX, bbox.maxY), center, element.angle);
    const [bottomLeftX, bottomLeftY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bbox.minX, bbox.maxY), center, element.angle);
    const bounds = [
        Math.min(topLeftX, topRightX, bottomRightX, bottomLeftX),
        Math.min(topLeftY, topRightY, bottomRightY, bottomLeftY),
        Math.max(topLeftX, topRightX, bottomRightX, bottomLeftX),
        Math.max(topLeftY, topRightY, bottomRightY, bottomLeftY),
    ];
    if (offset) {
        const [topOffset, rightOffset, downOffset, leftOffset] = offset;
        return [
            bounds[0] - leftOffset,
            bounds[1] - topOffset,
            bounds[2] + rightOffset,
            bounds[3] + downOffset,
        ];
    }
    return bounds;
};
exports.aabbForElement = aabbForElement;
const pointInsideBounds = (p, bounds) => p[0] > bounds[0] && p[0] < bounds[2] && p[1] > bounds[1] && p[1] < bounds[3];
exports.pointInsideBounds = pointInsideBounds;
// TODO make pointInsideBounds inclusive and remove this function once we
// test nothing is breaking
const pointInsideBoundsInclusive = (p, bounds) => p[0] >= bounds[0] &&
    p[0] <= bounds[2] &&
    p[1] >= bounds[1] &&
    p[1] <= bounds[3];
exports.pointInsideBoundsInclusive = pointInsideBoundsInclusive;
const doBoundsIntersect = (bounds1, bounds2) => {
    if (bounds1 == null || bounds2 == null) {
        return false;
    }
    const [minX1, minY1, maxX1, maxY1] = bounds1;
    const [minX2, minY2, maxX2, maxY2] = bounds2;
    return minX1 < maxX2 && maxX1 > minX2 && minY1 < maxY2 && maxY1 > minY2;
};
exports.doBoundsIntersect = doBoundsIntersect;
const boundsContainBounds = (outerBounds, innerBounds) => [
    (0, math_1.pointFrom)(innerBounds[0], innerBounds[1]),
    (0, math_1.pointFrom)(innerBounds[0], innerBounds[3]),
    (0, math_1.pointFrom)(innerBounds[2], innerBounds[1]),
    (0, math_1.pointFrom)(innerBounds[2], innerBounds[3]),
].every((point) => (0, exports.pointInsideBoundsInclusive)(point, outerBounds));
exports.boundsContainBounds = boundsContainBounds;
const elementCenterPoint = (element, elementsMap, xOffset = 0, yOffset = 0) => {
    if ((0, typeChecks_1.isLinearElement)(element) || (0, typeChecks_1.isFreeDrawElement)(element)) {
        const [x1, y1, x2, y2] = (0, exports.getElementAbsoluteCoords)(element, elementsMap);
        const [x, y] = (0, math_1.pointFrom)((x1 + x2) / 2, (y1 + y2) / 2);
        return (0, math_1.pointFrom)(x + xOffset, y + yOffset);
    }
    const [x, y] = (0, exports.getCenterForBounds)((0, exports.getElementBounds)(element, elementsMap));
    return (0, math_1.pointFrom)(x + xOffset, y + yOffset);
};
exports.elementCenterPoint = elementCenterPoint;
