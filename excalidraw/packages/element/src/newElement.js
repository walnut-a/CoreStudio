"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newImageElement = exports.newArrowElement = exports.newLinearElement = exports.newFreeDrawElement = exports.refreshTextDimensions = exports.newTextElement = exports.newMagicFrameElement = exports.newFrameElement = exports.newIframeElement = exports.newEmbeddableElement = exports.newElement = void 0;
const common_1 = require("@excalidraw/common");
const bounds_1 = require("./bounds");
const mutateElement_1 = require("./mutateElement");
const textElement_1 = require("./textElement");
const textMeasurements_1 = require("./textMeasurements");
const textWrapping_1 = require("./textWrapping");
const typeChecks_1 = require("./typeChecks");
const _newElementBase = (type, { x, y, strokeColor = common_1.DEFAULT_ELEMENT_PROPS.strokeColor, backgroundColor = common_1.DEFAULT_ELEMENT_PROPS.backgroundColor, fillStyle = common_1.DEFAULT_ELEMENT_PROPS.fillStyle, strokeWidth = common_1.DEFAULT_ELEMENT_PROPS.strokeWidth, strokeStyle = common_1.DEFAULT_ELEMENT_PROPS.strokeStyle, roughness = common_1.DEFAULT_ELEMENT_PROPS.roughness, opacity = common_1.DEFAULT_ELEMENT_PROPS.opacity, width = 0, height = 0, angle = 0, groupIds = [], frameId = null, index = null, roundness = null, boundElements = null, link = null, locked = common_1.DEFAULT_ELEMENT_PROPS.locked, ...rest }) => {
    // NOTE (mtolmacs): This is a temporary check to detect extremely large
    // element position or sizing
    if (x < -1e6 ||
        x > 1e6 ||
        y < -1e6 ||
        y > 1e6 ||
        width < -1e6 ||
        width > 1e6 ||
        height < -1e6 ||
        height > 1e6) {
        console.error("New element size or position is too large", {
            x,
            y,
            width,
            height,
            // @ts-ignore
            points: rest.points,
        });
    }
    // assign type to guard against excess properties
    const element = {
        id: rest.id || (0, common_1.randomId)(),
        type,
        x,
        y,
        width,
        height,
        angle,
        strokeColor,
        backgroundColor,
        fillStyle,
        strokeWidth,
        strokeStyle,
        roughness,
        opacity,
        groupIds,
        frameId,
        index,
        roundness,
        seed: rest.seed ?? (0, common_1.randomInteger)(),
        version: rest.version || 1,
        versionNonce: rest.versionNonce ?? 0,
        isDeleted: false,
        boundElements,
        updated: (0, common_1.getUpdatedTimestamp)(),
        link,
        locked,
        customData: rest.customData,
    };
    return element;
};
const newElement = (opts) => _newElementBase(opts.type, opts);
exports.newElement = newElement;
const newEmbeddableElement = (opts) => {
    return _newElementBase("embeddable", opts);
};
exports.newEmbeddableElement = newEmbeddableElement;
const newIframeElement = (opts) => {
    return {
        ..._newElementBase("iframe", opts),
    };
};
exports.newIframeElement = newIframeElement;
const newFrameElement = (opts) => {
    const frameElement = (0, mutateElement_1.newElementWith)({
        ..._newElementBase("frame", opts),
        type: "frame",
        name: opts?.name || null,
    }, {});
    return frameElement;
};
exports.newFrameElement = newFrameElement;
const newMagicFrameElement = (opts) => {
    const frameElement = (0, mutateElement_1.newElementWith)({
        ..._newElementBase("magicframe", opts),
        type: "magicframe",
        name: opts?.name || null,
    }, {});
    return frameElement;
};
exports.newMagicFrameElement = newMagicFrameElement;
/** computes element x/y offset based on textAlign/verticalAlign */
const getTextElementPositionOffsets = (opts, metrics) => {
    return {
        x: opts.textAlign === "center"
            ? metrics.width / 2
            : opts.textAlign === "right"
                ? metrics.width
                : 0,
        y: opts.verticalAlign === "middle" ? metrics.height / 2 : 0,
    };
};
const newTextElement = (opts) => {
    const fontFamily = opts.fontFamily || common_1.DEFAULT_FONT_FAMILY;
    const fontSize = opts.fontSize || common_1.DEFAULT_FONT_SIZE;
    const lineHeight = opts.lineHeight || (0, common_1.getLineHeight)(fontFamily);
    const text = (0, textMeasurements_1.normalizeText)(opts.text);
    const metrics = (0, textMeasurements_1.measureText)(text, (0, common_1.getFontString)({ fontFamily, fontSize }), lineHeight);
    const textAlign = opts.textAlign || common_1.DEFAULT_TEXT_ALIGN;
    const verticalAlign = opts.verticalAlign || common_1.DEFAULT_VERTICAL_ALIGN;
    const offsets = getTextElementPositionOffsets({ textAlign, verticalAlign }, metrics);
    const textElementProps = {
        ..._newElementBase("text", opts),
        text,
        fontSize,
        fontFamily,
        textAlign,
        verticalAlign,
        x: opts.x - offsets.x,
        y: opts.y - offsets.y,
        width: metrics.width,
        height: metrics.height,
        containerId: opts.containerId || null,
        originalText: opts.originalText ?? text,
        autoResize: opts.autoResize ?? true,
        lineHeight,
    };
    const textElement = (0, mutateElement_1.newElementWith)(textElementProps, {});
    return textElement;
};
exports.newTextElement = newTextElement;
const getAdjustedDimensions = (element, elementsMap, nextText) => {
    let { width: nextWidth, height: nextHeight } = (0, textMeasurements_1.measureText)(nextText, (0, common_1.getFontString)(element), element.lineHeight);
    // wrapped text
    if (!element.autoResize) {
        nextWidth = element.width;
    }
    const { textAlign, verticalAlign } = element;
    let x;
    let y;
    if (textAlign === "center" &&
        verticalAlign === common_1.VERTICAL_ALIGN.MIDDLE &&
        !element.containerId &&
        element.autoResize) {
        const prevMetrics = (0, textMeasurements_1.measureText)(element.text, (0, common_1.getFontString)(element), element.lineHeight);
        const offsets = getTextElementPositionOffsets(element, {
            width: nextWidth - prevMetrics.width,
            height: nextHeight - prevMetrics.height,
        });
        x = element.x - offsets.x;
        y = element.y - offsets.y;
    }
    else {
        const [x1, y1, x2, y2] = (0, bounds_1.getElementAbsoluteCoords)(element, elementsMap);
        const [nextX1, nextY1, nextX2, nextY2] = (0, bounds_1.getResizedElementAbsoluteCoords)(element, nextWidth, nextHeight, false);
        const deltaX1 = (x1 - nextX1) / 2;
        const deltaY1 = (y1 - nextY1) / 2;
        const deltaX2 = (x2 - nextX2) / 2;
        const deltaY2 = (y2 - nextY2) / 2;
        [x, y] = adjustXYWithRotation({
            s: true,
            e: textAlign === "center" || textAlign === "left",
            w: textAlign === "center" || textAlign === "right",
        }, element.x, element.y, element.angle, deltaX1, deltaY1, deltaX2, deltaY2);
    }
    return {
        width: nextWidth,
        height: nextHeight,
        x: Number.isFinite(x) ? x : element.x,
        y: Number.isFinite(y) ? y : element.y,
    };
};
const adjustXYWithRotation = (sides, x, y, angle, deltaX1, deltaY1, deltaX2, deltaY2) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    if (sides.e && sides.w) {
        x += deltaX1 + deltaX2;
    }
    else if (sides.e) {
        x += deltaX1 * (1 + cos);
        y += deltaX1 * sin;
        x += deltaX2 * (1 - cos);
        y += deltaX2 * -sin;
    }
    else if (sides.w) {
        x += deltaX1 * (1 - cos);
        y += deltaX1 * -sin;
        x += deltaX2 * (1 + cos);
        y += deltaX2 * sin;
    }
    if (sides.n && sides.s) {
        y += deltaY1 + deltaY2;
    }
    else if (sides.n) {
        x += deltaY1 * sin;
        y += deltaY1 * (1 - cos);
        x += deltaY2 * -sin;
        y += deltaY2 * (1 + cos);
    }
    else if (sides.s) {
        x += deltaY1 * -sin;
        y += deltaY1 * (1 + cos);
        x += deltaY2 * sin;
        y += deltaY2 * (1 - cos);
    }
    return [x, y];
};
const refreshTextDimensions = (textElement, container, elementsMap, text = textElement.text) => {
    if (textElement.isDeleted) {
        return;
    }
    if (container || !textElement.autoResize) {
        text = (0, textWrapping_1.wrapText)(text, (0, common_1.getFontString)(textElement), container
            ? (0, textElement_1.getBoundTextMaxWidth)(container, textElement)
            : textElement.width);
    }
    const dimensions = getAdjustedDimensions(textElement, elementsMap, text);
    return { text, ...dimensions };
};
exports.refreshTextDimensions = refreshTextDimensions;
const newFreeDrawElement = (opts) => {
    return {
        ..._newElementBase(opts.type, opts),
        points: opts.points || [],
        pressures: opts.pressures || [],
        simulatePressure: opts.simulatePressure,
    };
};
exports.newFreeDrawElement = newFreeDrawElement;
const newLinearElement = (opts) => {
    const element = {
        ..._newElementBase(opts.type, opts),
        points: opts.points || [],
        startBinding: null,
        endBinding: null,
        startArrowhead: null,
        endArrowhead: null,
    };
    if ((0, typeChecks_1.isLineElement)(element)) {
        const lineElement = {
            ...element,
            polygon: opts.polygon ?? false,
        };
        return lineElement;
    }
    return element;
};
exports.newLinearElement = newLinearElement;
const newArrowElement = (opts) => {
    if (opts.elbowed) {
        return {
            ..._newElementBase(opts.type, opts),
            points: opts.points || [],
            startBinding: null,
            endBinding: null,
            startArrowhead: opts.startArrowhead || null,
            endArrowhead: opts.endArrowhead || null,
            elbowed: true,
            fixedSegments: opts.fixedSegments || [],
            startIsSpecial: false,
            endIsSpecial: false,
        };
    }
    return {
        ..._newElementBase(opts.type, opts),
        points: opts.points || [],
        startBinding: null,
        endBinding: null,
        startArrowhead: opts.startArrowhead || null,
        endArrowhead: opts.endArrowhead || null,
        elbowed: false,
    };
};
exports.newArrowElement = newArrowElement;
const newImageElement = (opts) => {
    return {
        ..._newElementBase("image", opts),
        // in the future we'll support changing stroke color for some SVG elements,
        // and `transparent` will likely mean "use original colors of the image"
        strokeColor: "transparent",
        status: opts.status ?? "pending",
        fileId: opts.fileId ?? null,
        scale: opts.scale ?? [1, 1],
        crop: opts.crop ?? null,
    };
};
exports.newImageElement = newImageElement;
