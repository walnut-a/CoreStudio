"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartesian2Polar = exports.normalizeRadians = void 0;
exports.degreesToRadians = degreesToRadians;
exports.radiansToDegrees = radiansToDegrees;
exports.isRightAngleRads = isRightAngleRads;
exports.radiansBetweenAngles = radiansBetweenAngles;
exports.radiansDifference = radiansDifference;
const utils_1 = require("./utils");
const normalizeRadians = (angle) => angle < 0
    ? ((angle % (2 * Math.PI)) + 2 * Math.PI)
    : (angle % (2 * Math.PI));
exports.normalizeRadians = normalizeRadians;
/**
 * Return the polar coordinates for the given cartesian point represented by
 * (x, y) for the center point 0,0 where the first number returned is the radius,
 * the second is the angle in radians.
 */
const cartesian2Polar = ([x, y,]) => [
    Math.hypot(x, y),
    (0, exports.normalizeRadians)(Math.atan2(y, x)),
];
exports.cartesian2Polar = cartesian2Polar;
function degreesToRadians(degrees) {
    return ((degrees * Math.PI) / 180);
}
function radiansToDegrees(degrees) {
    return ((degrees * 180) / Math.PI);
}
/**
 * Determines if the provided angle is a right angle.
 *
 * @param rads The angle to measure
 * @returns TRUE if the provided angle is a right angle
 */
function isRightAngleRads(rads) {
    return Math.abs(Math.sin(2 * rads)) < utils_1.PRECISION;
}
function radiansBetweenAngles(a, min, max) {
    a = (0, exports.normalizeRadians)(a);
    min = (0, exports.normalizeRadians)(min);
    max = (0, exports.normalizeRadians)(max);
    if (min < max) {
        return a >= min && a <= max;
    }
    // The range wraps around the 0 angle
    return a >= min || a <= max;
}
function radiansDifference(a, b) {
    a = (0, exports.normalizeRadians)(a);
    b = (0, exports.normalizeRadians)(b);
    let diff = a - b;
    if (diff < -Math.PI) {
        diff = (diff + 2 * Math.PI);
    }
    else if (diff > Math.PI) {
        diff = (diff - 2 * Math.PI);
    }
    return Math.abs(diff);
}
