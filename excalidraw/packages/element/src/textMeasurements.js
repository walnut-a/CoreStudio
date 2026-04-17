"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMaxCharWidth = exports.getMinCharWidth = exports.charWidth = exports.getTextHeight = exports.getTextWidth = exports.getLineWidth = exports.setCustomTextMetricsProvider = exports.getApproxMinLineHeight = exports.getLineHeightInPx = exports.detectLineHeight = exports.normalizeText = exports.isMeasureTextSupported = exports.getMinTextElementWidth = exports.getApproxMinLineWidth = exports.measureText = void 0;
const common_1 = require("@excalidraw/common");
const measureText = (text, font, lineHeight) => {
    const _text = text
        .split("\n")
        // replace empty lines with single space because leading/trailing empty
        // lines would be stripped from computation
        .map((x) => x || " ")
        .join("\n");
    const fontSize = parseFloat(font);
    const height = (0, exports.getTextHeight)(_text, fontSize, lineHeight);
    const width = (0, exports.getTextWidth)(_text, font);
    return { width, height };
};
exports.measureText = measureText;
const DUMMY_TEXT = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".toLocaleUpperCase();
// FIXME rename to getApproxMinContainerWidth
const getApproxMinLineWidth = (font, lineHeight) => {
    const maxCharWidth = (0, exports.getMaxCharWidth)(font);
    if (maxCharWidth === 0) {
        return ((0, exports.measureText)(DUMMY_TEXT.split("").join("\n"), font, lineHeight).width +
            common_1.BOUND_TEXT_PADDING * 2);
    }
    return maxCharWidth + common_1.BOUND_TEXT_PADDING * 2;
};
exports.getApproxMinLineWidth = getApproxMinLineWidth;
const getMinTextElementWidth = (font, lineHeight) => {
    return (0, exports.measureText)("", font, lineHeight).width + common_1.BOUND_TEXT_PADDING * 2;
};
exports.getMinTextElementWidth = getMinTextElementWidth;
const isMeasureTextSupported = () => {
    const width = (0, exports.getTextWidth)(DUMMY_TEXT, (0, common_1.getFontString)({
        fontSize: common_1.DEFAULT_FONT_SIZE,
        fontFamily: common_1.DEFAULT_FONT_FAMILY,
    }));
    return width > 0;
};
exports.isMeasureTextSupported = isMeasureTextSupported;
const normalizeText = (text) => {
    return ((0, common_1.normalizeEOL)(text)
        // replace tabs with spaces so they render and measure correctly
        .replace(/\t/g, "        "));
};
exports.normalizeText = normalizeText;
const splitIntoLines = (text) => {
    return (0, exports.normalizeText)(text).split("\n");
};
/**
 * To get unitless line-height (if unknown) we can calculate it by dividing
 * height-per-line by fontSize.
 */
const detectLineHeight = (textElement) => {
    const lineCount = splitIntoLines(textElement.text).length;
    return (textElement.height /
        lineCount /
        textElement.fontSize);
};
exports.detectLineHeight = detectLineHeight;
/**
 * We calculate the line height from the font size and the unitless line height,
 * aligning with the W3C spec.
 */
const getLineHeightInPx = (fontSize, lineHeight) => {
    return fontSize * lineHeight;
};
exports.getLineHeightInPx = getLineHeightInPx;
// FIXME rename to getApproxMinContainerHeight
const getApproxMinLineHeight = (fontSize, lineHeight) => {
    return (0, exports.getLineHeightInPx)(fontSize, lineHeight) + common_1.BOUND_TEXT_PADDING * 2;
};
exports.getApproxMinLineHeight = getApproxMinLineHeight;
let textMetricsProvider;
/**
 * Set a custom text metrics provider.
 *
 * Useful for overriding the width calculation algorithm where canvas API is not available / desired.
 */
const setCustomTextMetricsProvider = (provider) => {
    textMetricsProvider = provider;
};
exports.setCustomTextMetricsProvider = setCustomTextMetricsProvider;
class CanvasTextMetricsProvider {
    canvas;
    constructor() {
        this.canvas = document.createElement("canvas");
    }
    /**
     * We need to use the advance width as that's the closest thing to the browser wrapping algo, hence using it for:
     * - text wrapping
     * - wysiwyg editor (+padding)
     *
     * > The advance width is the distance between the glyph's initial pen position and the next glyph's initial pen position.
     */
    getLineWidth(text, fontString) {
        const context = this.canvas.getContext("2d");
        context.font = fontString;
        const metrics = context.measureText(text);
        const advanceWidth = metrics.width;
        // since in test env the canvas measureText algo
        // doesn't measure text and instead just returns number of
        // characters hence we assume that each letteris 10px
        if ((0, common_1.isTestEnv)()) {
            return advanceWidth * 10;
        }
        return advanceWidth;
    }
}
const getLineWidth = (text, font) => {
    if (!textMetricsProvider) {
        textMetricsProvider = new CanvasTextMetricsProvider();
    }
    return textMetricsProvider.getLineWidth(text, font);
};
exports.getLineWidth = getLineWidth;
const getTextWidth = (text, font) => {
    const lines = splitIntoLines(text);
    let width = 0;
    lines.forEach((line) => {
        width = Math.max(width, (0, exports.getLineWidth)(line, font));
    });
    return width;
};
exports.getTextWidth = getTextWidth;
const getTextHeight = (text, fontSize, lineHeight) => {
    const lineCount = splitIntoLines(text).length;
    return (0, exports.getLineHeightInPx)(fontSize, lineHeight) * lineCount;
};
exports.getTextHeight = getTextHeight;
exports.charWidth = (() => {
    const cachedCharWidth = {};
    const calculate = (char, font) => {
        const unicode = char.charCodeAt(0);
        if (!cachedCharWidth[font]) {
            cachedCharWidth[font] = [];
        }
        if (!cachedCharWidth[font][unicode]) {
            const width = (0, exports.getLineWidth)(char, font);
            cachedCharWidth[font][unicode] = width;
        }
        return cachedCharWidth[font][unicode];
    };
    const getCache = (font) => {
        return cachedCharWidth[font];
    };
    const clearCache = (font) => {
        cachedCharWidth[font] = [];
    };
    return {
        calculate,
        getCache,
        clearCache,
    };
})();
const getMinCharWidth = (font) => {
    const cache = exports.charWidth.getCache(font);
    if (!cache) {
        return 0;
    }
    const cacheWithOutEmpty = cache.filter((val) => val !== undefined);
    return Math.min(...cacheWithOutEmpty);
};
exports.getMinCharWidth = getMinCharWidth;
const getMaxCharWidth = (font) => {
    const cache = exports.charWidth.getCache(font);
    if (!cache) {
        return 0;
    }
    const cacheWithOutEmpty = cache.filter((val) => val !== undefined);
    return Math.max(...cacheWithOutEmpty);
};
exports.getMaxCharWidth = getMaxCharWidth;
