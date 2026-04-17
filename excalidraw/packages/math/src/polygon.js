"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pointOnPolygon = exports.polygonIncludesPointNonZero = exports.polygonIncludesPoint = void 0;
exports.polygon = polygon;
exports.polygonFromPoints = polygonFromPoints;
const point_1 = require("./point");
const segment_1 = require("./segment");
const utils_1 = require("./utils");
function polygon(...points) {
    return polygonClose(points);
}
function polygonFromPoints(points) {
    return polygonClose(points);
}
const polygonIncludesPoint = (point, polygon) => {
    const x = point[0];
    const y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];
        if (((yi > y && yj <= y) || (yi <= y && yj > y)) &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
};
exports.polygonIncludesPoint = polygonIncludesPoint;
const polygonIncludesPointNonZero = (point, polygon) => {
    const [x, y] = point;
    let windingNumber = 0;
    for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length;
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (yi <= y) {
            if (yj > y) {
                if ((xj - xi) * (y - yi) - (x - xi) * (yj - yi) > 0) {
                    windingNumber++;
                }
            }
        }
        else if (yj <= y) {
            if ((xj - xi) * (y - yi) - (x - xi) * (yj - yi) < 0) {
                windingNumber--;
            }
        }
    }
    return windingNumber !== 0;
};
exports.polygonIncludesPointNonZero = polygonIncludesPointNonZero;
const pointOnPolygon = (p, poly, threshold = utils_1.PRECISION) => {
    let on = false;
    for (let i = 0, l = poly.length - 1; i < l; i++) {
        if ((0, segment_1.pointOnLineSegment)(p, (0, segment_1.lineSegment)(poly[i], poly[i + 1]), threshold)) {
            on = true;
            break;
        }
    }
    return on;
};
exports.pointOnPolygon = pointOnPolygon;
function polygonClose(polygon) {
    return polygonIsClosed(polygon)
        ? polygon
        : [...polygon, polygon[0]];
}
function polygonIsClosed(polygon) {
    return (0, point_1.pointsEqual)(polygon[0], polygon[polygon.length - 1]);
}
