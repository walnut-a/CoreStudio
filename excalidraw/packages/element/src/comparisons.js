"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canHaveArrowheads = exports.toolIsArrow = exports.canChangeRoundness = exports.hasStrokeStyle = exports.hasStrokeWidth = exports.hasStrokeColor = exports.hasBackground = void 0;
const hasBackground = (type) => type === "rectangle" ||
    type === "iframe" ||
    type === "embeddable" ||
    type === "ellipse" ||
    type === "diamond" ||
    type === "line" ||
    type === "freedraw";
exports.hasBackground = hasBackground;
const hasStrokeColor = (type) => type === "rectangle" ||
    type === "ellipse" ||
    type === "diamond" ||
    type === "freedraw" ||
    type === "arrow" ||
    type === "line" ||
    type === "text" ||
    type === "embeddable";
exports.hasStrokeColor = hasStrokeColor;
const hasStrokeWidth = (type) => type === "rectangle" ||
    type === "iframe" ||
    type === "embeddable" ||
    type === "ellipse" ||
    type === "diamond" ||
    type === "freedraw" ||
    type === "arrow" ||
    type === "line";
exports.hasStrokeWidth = hasStrokeWidth;
const hasStrokeStyle = (type) => type === "rectangle" ||
    type === "iframe" ||
    type === "embeddable" ||
    type === "ellipse" ||
    type === "diamond" ||
    type === "arrow" ||
    type === "line";
exports.hasStrokeStyle = hasStrokeStyle;
const canChangeRoundness = (type) => type === "rectangle" ||
    type === "iframe" ||
    type === "embeddable" ||
    type === "line" ||
    type === "diamond" ||
    type === "image";
exports.canChangeRoundness = canChangeRoundness;
const toolIsArrow = (type) => type === "arrow";
exports.toolIsArrow = toolIsArrow;
const canHaveArrowheads = (type) => type === "arrow";
exports.canHaveArrowheads = canHaveArrowheads;
