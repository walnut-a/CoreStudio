"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ellipseExtremes = exports.ellipseFocusToCenter = exports.ellipseAxes = exports.pointInEllipse = exports.pointOnEllipse = exports.segmentIntersectRectangleElement = exports.getClosedCurveShape = exports.getFreedrawShape = exports.getCurveShape = exports.getCurvePathOps = exports.getEllipseShape = exports.getSelectionBoxShape = exports.getPolygonShape = void 0;
/**
 * this file defines pure geometric shapes
 *
 * for instance, a cubic bezier curve is specified by its four control points and
 * an ellipse is defined by its center, angle, semi major axis and semi minor axis
 * (but in semi-width and semi-height so it's more relevant to Excalidraw)
 *
 * the idea with pure shapes is so that we can provide collision and other geoemtric methods not depending on
 * the specifics of roughjs or elements in Excalidraw; instead, we can focus on the pure shapes themselves
 *
 * also included in this file are methods for converting an Excalidraw element or a Drawable from roughjs
 * to pure shapes
 */
const points_on_curve_1 = require("points-on-curve");
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const element_1 = require("@excalidraw/element");
// polygon
const getPolygonShape = (element) => {
    const { angle, width, height, x, y } = element;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const center = (0, math_1.pointFrom)(cx, cy);
    let data;
    if (element.type === "diamond") {
        data = (0, math_1.polygon)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(cx, y), center, angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x + width, cy), center, angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(cx, y + height), center, angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x, cy), center, angle));
    }
    else {
        data = (0, math_1.polygon)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(x, y), center, angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x + width, y), center, angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x + width, y + height), center, angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x, y + height), center, angle));
    }
    return {
        type: "polygon",
        data,
    };
};
exports.getPolygonShape = getPolygonShape;
// return the selection box for an element, possibly rotated as well
const getSelectionBoxShape = (element, elementsMap, padding = 10) => {
    let [x1, y1, x2, y2, cx, cy] = (0, element_1.getElementAbsoluteCoords)(element, elementsMap, true);
    x1 -= padding;
    x2 += padding;
    y1 -= padding;
    y2 += padding;
    //const angleInDegrees = angleToDegrees(element.angle);
    const center = (0, math_1.pointFrom)(cx, cy);
    const topLeft = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x1, y1), center, element.angle);
    const topRight = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x2, y1), center, element.angle);
    const bottomLeft = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x1, y2), center, element.angle);
    const bottomRight = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x2, y2), center, element.angle);
    return {
        type: "polygon",
        data: [topLeft, topRight, bottomRight, bottomLeft],
    };
};
exports.getSelectionBoxShape = getSelectionBoxShape;
// ellipse
const getEllipseShape = (element) => {
    const { width, height, angle, x, y } = element;
    return {
        type: "ellipse",
        data: {
            center: (0, math_1.pointFrom)(x + width / 2, y + height / 2),
            angle,
            halfWidth: width / 2,
            halfHeight: height / 2,
        },
    };
};
exports.getEllipseShape = getEllipseShape;
const getCurvePathOps = (shape) => {
    // NOTE (mtolmacs): Temporary fix for extremely large elements
    if (!shape) {
        return [];
    }
    for (const set of shape.sets) {
        if (set.type === "path") {
            return set.ops;
        }
    }
    return shape.sets[0].ops;
};
exports.getCurvePathOps = getCurvePathOps;
// linear
const getCurveShape = (roughShape, startingPoint = (0, math_1.pointFrom)(0, 0), angleInRadian, center) => {
    const transform = (p) => (0, math_1.pointRotateRads)((0, math_1.pointFrom)(p[0] + startingPoint[0], p[1] + startingPoint[1]), center, angleInRadian);
    const ops = (0, exports.getCurvePathOps)(roughShape);
    const polycurve = [];
    let p0 = (0, math_1.pointFrom)(0, 0);
    for (const op of ops) {
        if (op.op === "move") {
            const p = (0, math_1.pointFromArray)(op.data);
            (0, common_1.invariant)(p != null, "Ops data is not a point");
            p0 = transform(p);
        }
        if (op.op === "bcurveTo") {
            const p1 = transform((0, math_1.pointFrom)(op.data[0], op.data[1]));
            const p2 = transform((0, math_1.pointFrom)(op.data[2], op.data[3]));
            const p3 = transform((0, math_1.pointFrom)(op.data[4], op.data[5]));
            polycurve.push((0, math_1.curve)(p0, p1, p2, p3));
            p0 = p3;
        }
    }
    return {
        type: "polycurve",
        data: polycurve,
    };
};
exports.getCurveShape = getCurveShape;
const polylineFromPoints = (points) => {
    let previousPoint = points[0];
    const polyline = [];
    for (let i = 1; i < points.length; i++) {
        const nextPoint = points[i];
        polyline.push((0, math_1.lineSegment)(previousPoint, nextPoint));
        previousPoint = nextPoint;
    }
    return polyline;
};
const getFreedrawShape = (element, center, isClosed = false) => {
    const transform = (p) => (0, math_1.pointRotateRads)((0, math_1.pointFromVector)((0, math_1.vectorAdd)((0, math_1.vectorFromPoint)(p), (0, math_1.vector)(element.x, element.y))), center, element.angle);
    const polyline = polylineFromPoints(element.points.map((p) => transform(p)));
    return (isClosed
        ? {
            type: "polygon",
            data: (0, math_1.polygonFromPoints)(polyline.flat()),
        }
        : {
            type: "polyline",
            data: polyline,
        });
};
exports.getFreedrawShape = getFreedrawShape;
const getClosedCurveShape = (element, roughShape, startingPoint = (0, math_1.pointFrom)(0, 0), angleInRadian, center) => {
    const transform = (p) => (0, math_1.pointRotateRads)((0, math_1.pointFrom)(p[0] + startingPoint[0], p[1] + startingPoint[1]), center, angleInRadian);
    if (element.roundness === null) {
        return {
            type: "polygon",
            data: (0, math_1.polygonFromPoints)(element.points.map((p) => transform(p))),
        };
    }
    const ops = (0, exports.getCurvePathOps)(roughShape);
    const points = [];
    let odd = false;
    for (const operation of ops) {
        if (operation.op === "move") {
            odd = !odd;
            if (odd) {
                points.push((0, math_1.pointFrom)(operation.data[0], operation.data[1]));
            }
        }
        else if (operation.op === "bcurveTo") {
            if (odd) {
                points.push((0, math_1.pointFrom)(operation.data[0], operation.data[1]));
                points.push((0, math_1.pointFrom)(operation.data[2], operation.data[3]));
                points.push((0, math_1.pointFrom)(operation.data[4], operation.data[5]));
            }
        }
        else if (operation.op === "lineTo") {
            if (odd) {
                points.push((0, math_1.pointFrom)(operation.data[0], operation.data[1]));
            }
        }
    }
    const polygonPoints = (0, points_on_curve_1.pointsOnBezierCurves)(points, 10, 5).map((p) => transform(p));
    return {
        type: "polygon",
        data: (0, math_1.polygonFromPoints)(polygonPoints),
    };
};
exports.getClosedCurveShape = getClosedCurveShape;
/**
 * Determine intersection of a rectangular shaped element and a
 * line segment.
 *
 * @param element The rectangular element to test against
 * @param segment The segment intersecting the element
 * @param gap Optional value to inflate the shape before testing
 * @returns An array of intersections
 */
// TODO: Replace with final rounded rectangle code
const segmentIntersectRectangleElement = (element, segment, gap = 0) => {
    const bounds = [
        element.x - gap,
        element.y - gap,
        element.x + element.width + gap,
        element.y + element.height + gap,
    ];
    const center = (0, math_1.pointFrom)((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2);
    return [
        (0, math_1.lineSegment)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(bounds[0], bounds[1]), center, element.angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bounds[2], bounds[1]), center, element.angle)),
        (0, math_1.lineSegment)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(bounds[2], bounds[1]), center, element.angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bounds[2], bounds[3]), center, element.angle)),
        (0, math_1.lineSegment)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(bounds[2], bounds[3]), center, element.angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bounds[0], bounds[3]), center, element.angle)),
        (0, math_1.lineSegment)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(bounds[0], bounds[3]), center, element.angle), (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bounds[0], bounds[1]), center, element.angle)),
    ]
        .map((s) => (0, math_1.segmentsIntersectAt)(segment, s))
        .filter((i) => !!i);
};
exports.segmentIntersectRectangleElement = segmentIntersectRectangleElement;
const distanceToEllipse = (p, ellipse) => {
    const { angle, halfWidth, halfHeight, center } = ellipse;
    const a = halfWidth;
    const b = halfHeight;
    const translatedPoint = (0, math_1.vectorAdd)((0, math_1.vectorFromPoint)(p), (0, math_1.vectorScale)((0, math_1.vectorFromPoint)(center), -1));
    const [rotatedPointX, rotatedPointY] = (0, math_1.pointRotateRads)((0, math_1.pointFromVector)(translatedPoint), (0, math_1.pointFrom)(0, 0), -angle);
    const px = Math.abs(rotatedPointX);
    const py = Math.abs(rotatedPointY);
    let tx = 0.707;
    let ty = 0.707;
    for (let i = 0; i < 3; i++) {
        const x = a * tx;
        const y = b * ty;
        const ex = ((a * a - b * b) * tx ** 3) / a;
        const ey = ((b * b - a * a) * ty ** 3) / b;
        const rx = x - ex;
        const ry = y - ey;
        const qx = px - ex;
        const qy = py - ey;
        const r = Math.hypot(ry, rx);
        const q = Math.hypot(qy, qx);
        tx = Math.min(1, Math.max(0, ((qx * r) / q + ex) / a));
        ty = Math.min(1, Math.max(0, ((qy * r) / q + ey) / b));
        const t = Math.hypot(ty, tx);
        tx /= t;
        ty /= t;
    }
    const [minX, minY] = [
        a * tx * Math.sign(rotatedPointX),
        b * ty * Math.sign(rotatedPointY),
    ];
    return (0, math_1.pointDistance)((0, math_1.pointFrom)(rotatedPointX, rotatedPointY), (0, math_1.pointFrom)(minX, minY));
};
const pointOnEllipse = (point, ellipse, threshold = math_1.PRECISION) => {
    return distanceToEllipse(point, ellipse) <= threshold;
};
exports.pointOnEllipse = pointOnEllipse;
const pointInEllipse = (p, ellipse) => {
    const { center, angle, halfWidth, halfHeight } = ellipse;
    const translatedPoint = (0, math_1.vectorAdd)((0, math_1.vectorFromPoint)(p), (0, math_1.vectorScale)((0, math_1.vectorFromPoint)(center), -1));
    const [rotatedPointX, rotatedPointY] = (0, math_1.pointRotateRads)((0, math_1.pointFromVector)(translatedPoint), (0, math_1.pointFrom)(0, 0), -angle);
    return ((rotatedPointX / halfWidth) * (rotatedPointX / halfWidth) +
        (rotatedPointY / halfHeight) * (rotatedPointY / halfHeight) <=
        1);
};
exports.pointInEllipse = pointInEllipse;
const ellipseAxes = (ellipse) => {
    const widthGreaterThanHeight = ellipse.halfWidth > ellipse.halfHeight;
    const majorAxis = widthGreaterThanHeight
        ? ellipse.halfWidth * 2
        : ellipse.halfHeight * 2;
    const minorAxis = widthGreaterThanHeight
        ? ellipse.halfHeight * 2
        : ellipse.halfWidth * 2;
    return {
        majorAxis,
        minorAxis,
    };
};
exports.ellipseAxes = ellipseAxes;
const ellipseFocusToCenter = (ellipse) => {
    const { majorAxis, minorAxis } = (0, exports.ellipseAxes)(ellipse);
    return Math.sqrt(majorAxis ** 2 - minorAxis ** 2);
};
exports.ellipseFocusToCenter = ellipseFocusToCenter;
const ellipseExtremes = (ellipse) => {
    const { center, angle } = ellipse;
    const { majorAxis, minorAxis } = (0, exports.ellipseAxes)(ellipse);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const sqSum = majorAxis ** 2 + minorAxis ** 2;
    const sqDiff = (majorAxis ** 2 - minorAxis ** 2) * Math.cos(2 * angle);
    const yMax = Math.sqrt((sqSum - sqDiff) / 2);
    const xAtYMax = (yMax * sqSum * sin * cos) /
        (majorAxis ** 2 * sin ** 2 + minorAxis ** 2 * cos ** 2);
    const xMax = Math.sqrt((sqSum + sqDiff) / 2);
    const yAtXMax = (xMax * sqSum * sin * cos) /
        (majorAxis ** 2 * cos ** 2 + minorAxis ** 2 * sin ** 2);
    const centerVector = (0, math_1.vectorFromPoint)(center);
    return [
        (0, math_1.vectorAdd)((0, math_1.vector)(xAtYMax, yMax), centerVector),
        (0, math_1.vectorAdd)((0, math_1.vectorScale)((0, math_1.vector)(xAtYMax, yMax), -1), centerVector),
        (0, math_1.vectorAdd)((0, math_1.vector)(xMax, yAtXMax), centerVector),
        (0, math_1.vectorAdd)((0, math_1.vector)(xMax, yAtXMax), centerVector),
    ];
};
exports.ellipseExtremes = ellipseExtremes;
