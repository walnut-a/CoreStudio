"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCloseTo = exports.isFiniteNumber = exports.average = exports.roundToStep = exports.round = exports.clamp = exports.PRECISION = void 0;
exports.PRECISION = 10e-5;
const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};
exports.clamp = clamp;
const round = (value, precision, func = "round") => {
    const multiplier = Math.pow(10, precision);
    return Math[func]((value + Number.EPSILON) * multiplier) / multiplier;
};
exports.round = round;
const roundToStep = (value, step, func = "round") => {
    const factor = 1 / step;
    return Math[func](value * factor) / factor;
};
exports.roundToStep = roundToStep;
const average = (a, b) => (a + b) / 2;
exports.average = average;
const isFiniteNumber = (value) => {
    return typeof value === "number" && Number.isFinite(value);
};
exports.isFiniteNumber = isFiniteNumber;
const isCloseTo = (a, b, precision = exports.PRECISION) => Math.abs(a - b) < precision;
exports.isCloseTo = isCloseTo;
