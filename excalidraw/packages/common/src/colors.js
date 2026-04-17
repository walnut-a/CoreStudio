"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeInputColor = exports.isColorDark = exports.COLOR_OUTLINE_CONTRAST_THRESHOLD = exports.isTransparent = exports.colorToHex = exports.rgbToHex = exports.getAllColorsSpecificShade = exports.DEFAULT_ELEMENT_BACKGROUND_COLOR_PALETTE = exports.DEFAULT_ELEMENT_STROKE_COLOR_PALETTE = exports.DEFAULT_CANVAS_BACKGROUND_PICKS = exports.DEFAULT_ELEMENT_BACKGROUND_PICKS = exports.DEFAULT_ELEMENT_STROKE_PICKS = exports.COLOR_PALETTE = exports.DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX = exports.DEFAULT_ELEMENT_STROKE_COLOR_INDEX = exports.DEFAULT_CHART_COLOR_INDEX = exports.COLORS_PER_ROW = exports.MAX_CUSTOM_COLORS_USED_IN_CANVAS = exports.applyDarkModeFilter = void 0;
const tinycolor2_1 = __importDefault(require("tinycolor2"));
const math_1 = require("@excalidraw/math");
const math_2 = require("@excalidraw/math");
// ---------------------------------------------------------------------------
// Dark mode color transformation
// ---------------------------------------------------------------------------
// Browser-only cache to avoid memory leaks on server
const DARK_MODE_COLORS_CACHE = typeof window !== "undefined" ? new Map() : null;
function cssHueRotate(red, green, blue, degrees) {
    // normalize
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;
    // Convert degrees to radians
    const a = (0, math_2.degreesToRadians)(degrees);
    const c = Math.cos(a);
    const s = Math.sin(a);
    // rotation matrix
    const matrix = [
        0.213 + c * 0.787 - s * 0.213,
        0.715 - c * 0.715 - s * 0.715,
        0.072 - c * 0.072 + s * 0.928,
        0.213 - c * 0.213 + s * 0.143,
        0.715 + c * 0.285 + s * 0.14,
        0.072 - c * 0.072 - s * 0.283,
        0.213 - c * 0.213 - s * 0.787,
        0.715 - c * 0.715 + s * 0.715,
        0.072 + c * 0.928 + s * 0.072,
    ];
    // transform
    const newR = r * matrix[0] + g * matrix[1] + b * matrix[2];
    const newG = r * matrix[3] + g * matrix[4] + b * matrix[5];
    const newB = r * matrix[6] + g * matrix[7] + b * matrix[8];
    // clamp the values to [0, 1] range and convert back to [0, 255]
    return {
        r: Math.round(Math.max(0, Math.min(1, newR)) * 255),
        g: Math.round(Math.max(0, Math.min(1, newG)) * 255),
        b: Math.round(Math.max(0, Math.min(1, newB)) * 255),
    };
}
const cssInvert = (r, g, b, percent) => {
    const p = (0, math_1.clamp)(percent, 0, 100) / 100;
    // Function to invert a single color component
    const invertComponent = (color) => {
        // Apply the invert formula
        const inverted = color * (1 - p) + (255 - color) * p;
        // Round to the nearest integer and clamp to [0, 255]
        return Math.round((0, math_1.clamp)(inverted, 0, 255));
    };
    // Calculate the inverted RGB components
    const invertedR = invertComponent(r);
    const invertedG = invertComponent(g);
    const invertedB = invertComponent(b);
    return { r: invertedR, g: invertedG, b: invertedB };
};
const applyDarkModeFilter = (color) => {
    const cached = DARK_MODE_COLORS_CACHE?.get(color);
    if (cached) {
        return cached;
    }
    const tc = (0, tinycolor2_1.default)(color);
    const alpha = tc.getAlpha();
    // order of operations matters
    // (corresponds to "filter: invert(invertPercent) hue-rotate(hueDegrees)" in css)
    const rgb = tc.toRgb();
    const inverted = cssInvert(rgb.r, rgb.g, rgb.b, 93);
    const rotated = cssHueRotate(inverted.r, inverted.g, inverted.b, 180);
    const result = (0, exports.rgbToHex)(rotated.r, rotated.g, rotated.b, alpha);
    if (DARK_MODE_COLORS_CACHE) {
        DARK_MODE_COLORS_CACHE.set(color, result);
    }
    return result;
};
exports.applyDarkModeFilter = applyDarkModeFilter;
// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------
// FIXME can't put to utils.ts rn because of circular dependency
const pick = (source, keys) => {
    return keys.reduce((acc, key) => {
        if (key in source) {
            acc[key] = source[key];
        }
        return acc;
    }, {});
};
exports.MAX_CUSTOM_COLORS_USED_IN_CANVAS = 5;
exports.COLORS_PER_ROW = 5;
exports.DEFAULT_CHART_COLOR_INDEX = 4;
exports.DEFAULT_ELEMENT_STROKE_COLOR_INDEX = 4;
exports.DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX = 1;
exports.COLOR_PALETTE = {
    transparent: "transparent",
    black: "#1e1e1e",
    white: "#ffffff",
    // open-color from https://github.com/yeun/open-color/blob/master/open-color.js
    // corresponds to indexes [0,2,4,6,8] (weights: 50, 200, 400, 600, 800)
    gray: ["#f8f9fa", "#e9ecef", "#ced4da", "#868e96", "#343a40"],
    red: ["#fff5f5", "#ffc9c9", "#ff8787", "#fa5252", "#e03131"],
    pink: ["#fff0f6", "#fcc2d7", "#f783ac", "#e64980", "#c2255c"],
    grape: ["#f8f0fc", "#eebefa", "#da77f2", "#be4bdb", "#9c36b5"],
    violet: ["#f3f0ff", "#d0bfff", "#9775fa", "#7950f2", "#6741d9"],
    blue: ["#e7f5ff", "#a5d8ff", "#4dabf7", "#228be6", "#1971c2"],
    cyan: ["#e3fafc", "#99e9f2", "#3bc9db", "#15aabf", "#0c8599"],
    teal: ["#e6fcf5", "#96f2d7", "#38d9a9", "#12b886", "#099268"],
    green: ["#ebfbee", "#b2f2bb", "#69db7c", "#40c057", "#2f9e44"],
    yellow: ["#fff9db", "#ffec99", "#ffd43b", "#fab005", "#f08c00"],
    orange: ["#fff4e6", "#ffd8a8", "#ffa94d", "#fd7e14", "#e8590c"],
    // radix bronze shades [3,5,7,9,11]
    bronze: ["#f8f1ee", "#eaddd7", "#d2bab0", "#a18072", "#846358"],
};
const COMMON_ELEMENT_SHADES = pick(exports.COLOR_PALETTE, [
    "cyan",
    "blue",
    "violet",
    "grape",
    "pink",
    "green",
    "teal",
    "yellow",
    "orange",
    "red",
]);
// quick picks defaults
// -----------------------------------------------------------------------------
// ORDER matters for positioning in quick picker
exports.DEFAULT_ELEMENT_STROKE_PICKS = [
    exports.COLOR_PALETTE.black,
    exports.COLOR_PALETTE.red[exports.DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
    exports.COLOR_PALETTE.green[exports.DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
    exports.COLOR_PALETTE.blue[exports.DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
    exports.COLOR_PALETTE.yellow[exports.DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
];
// ORDER matters for positioning in quick picker
exports.DEFAULT_ELEMENT_BACKGROUND_PICKS = [
    exports.COLOR_PALETTE.transparent,
    exports.COLOR_PALETTE.red[exports.DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
    exports.COLOR_PALETTE.green[exports.DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
    exports.COLOR_PALETTE.blue[exports.DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
    exports.COLOR_PALETTE.yellow[exports.DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
];
// ORDER matters for positioning in quick picker
exports.DEFAULT_CANVAS_BACKGROUND_PICKS = [
    exports.COLOR_PALETTE.white,
    // radix slate2
    "#f8f9fa",
    // radix blue2
    "#f5faff",
    // radix yellow2
    "#fffce8",
    // radix bronze2
    "#fdf8f6",
];
// palette defaults
// -----------------------------------------------------------------------------
exports.DEFAULT_ELEMENT_STROKE_COLOR_PALETTE = {
    // 1st row
    transparent: exports.COLOR_PALETTE.transparent,
    white: exports.COLOR_PALETTE.white,
    gray: exports.COLOR_PALETTE.gray,
    black: exports.COLOR_PALETTE.black,
    bronze: exports.COLOR_PALETTE.bronze,
    // rest
    ...COMMON_ELEMENT_SHADES,
};
// ORDER matters for positioning in pallete (5x3 grid)s
exports.DEFAULT_ELEMENT_BACKGROUND_COLOR_PALETTE = {
    transparent: exports.COLOR_PALETTE.transparent,
    white: exports.COLOR_PALETTE.white,
    gray: exports.COLOR_PALETTE.gray,
    black: exports.COLOR_PALETTE.black,
    bronze: exports.COLOR_PALETTE.bronze,
    ...COMMON_ELEMENT_SHADES,
};
// color palette helpers
// -----------------------------------------------------------------------------
// !!!MUST BE WITHOUT GRAY, TRANSPARENT AND BLACK!!!
const getAllColorsSpecificShade = (index) => [
    // 2nd row
    exports.COLOR_PALETTE.cyan[index],
    exports.COLOR_PALETTE.blue[index],
    exports.COLOR_PALETTE.violet[index],
    exports.COLOR_PALETTE.grape[index],
    exports.COLOR_PALETTE.pink[index],
    // 3rd row
    exports.COLOR_PALETTE.green[index],
    exports.COLOR_PALETTE.teal[index],
    exports.COLOR_PALETTE.yellow[index],
    exports.COLOR_PALETTE.orange[index],
    exports.COLOR_PALETTE.red[index],
];
exports.getAllColorsSpecificShade = getAllColorsSpecificShade;
// -----------------------------------------------------------------------------
// other helpers
// -----------------------------------------------------------------------------
const rgbToHex = (r, g, b, a) => {
    // (1 << 24) adds 0x1000000 to ensure the hex string is always 7 chars,
    // then slice(1) removes the leading "1" to get exactly 6 hex digits
    // e.g. rgb(0,0,0) -> 0x1000000 -> "1000000" -> "000000"
    const hex6 = `#${((1 << 24) + (r << 16) + (g << 8) + b)
        .toString(16)
        .slice(1)}`;
    if (a !== undefined && a < 1) {
        // convert alpha from 0-1 float to 0-255 int, then to 2-digit hex
        // e.g. 0.5 -> 128 -> "80"
        const alphaHex = Math.round(a * 255)
            .toString(16)
            .padStart(2, "0");
        return `${hex6}${alphaHex}`;
    }
    return hex6;
};
exports.rgbToHex = rgbToHex;
/**
 * @returns #RRGGBB or #RRGGBBAA based on color containing non-opaque alpha,
 *  null if not valid color
 */
const colorToHex = (color) => {
    const tc = (0, tinycolor2_1.default)(color);
    if (!tc.isValid()) {
        return null;
    }
    const { r, g, b, a } = tc.toRgb();
    return (0, exports.rgbToHex)(r, g, b, a);
};
exports.colorToHex = colorToHex;
const isTransparent = (color) => {
    return (0, tinycolor2_1.default)(color).getAlpha() === 0;
};
exports.isTransparent = isTransparent;
// -----------------------------------------------------------------------------
// color contract helpers
// -----------------------------------------------------------------------------
exports.COLOR_OUTLINE_CONTRAST_THRESHOLD = 240;
const calculateContrast = (r, g, b) => {
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq;
};
// YIQ algo, inspiration from https://stackoverflow.com/a/11868398
const isColorDark = (color, threshold = 160) => {
    // no color ("") -> assume it default to black
    if (!color) {
        return true;
    }
    if ((0, exports.isTransparent)(color)) {
        return false;
    }
    const tc = (0, tinycolor2_1.default)(color);
    if (!tc.isValid()) {
        // invalid color -> assume it defaults to black
        return true;
    }
    const { r, g, b } = tc.toRgb();
    return calculateContrast(r, g, b) < threshold;
};
exports.isColorDark = isColorDark;
// -----------------------------------------------------------------------------
// normalization
// -----------------------------------------------------------------------------
/**
 * tries to keep the input color as-is if it's valid, making minimal adjustments
 * (trimming whitespace or adding `#` to hex colors)
 */
const normalizeInputColor = (color) => {
    color = color.trim();
    if ((0, exports.isTransparent)(color)) {
        return color;
    }
    const tc = (0, tinycolor2_1.default)(color);
    if (tc.isValid()) {
        // testing for `#` first fixes a bug on Electron (more specfically, an
        // Obsidian popout window), where a hex color without `#` is considered valid
        if (["hex", "hex8"].includes(tc.getFormat()) && !color.startsWith("#")) {
            return `#${color}`;
        }
        return color;
    }
    return null;
};
exports.normalizeInputColor = normalizeInputColor;
