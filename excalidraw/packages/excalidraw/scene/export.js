"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExportSize = exports.decodeSvgBase64Payload = exports.encodeSvgBase64Payload = exports.exportToSvg = exports.exportToCanvas = void 0;
const rough_1 = __importDefault(require("roughjs/bin/rough"));
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const element_7 = require("@excalidraw/element");
const appState_1 = require("../appState");
const encode_1 = require("../data/encode");
const json_1 = require("../data/json");
const fonts_1 = require("../fonts");
const staticScene_1 = require("../renderer/staticScene");
const staticSvgScene_1 = require("../renderer/staticSvgScene");
const truncateText = (element, maxWidth) => {
    if (element.width <= maxWidth) {
        return element;
    }
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = (0, common_1.getFontString)({
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
    });
    let text = element.text;
    const metrics = ctx.measureText(text);
    if (metrics.width > maxWidth) {
        // we iterate from the right, removing characters one by one instead
        // of bulding the string up. This assumes that it's more likely
        // your frame names will overflow by not that many characters
        // (if ever), so it sohuld be faster this way.
        for (let i = text.length; i > 0; i--) {
            const newText = `${text.slice(0, i)}...`;
            if (ctx.measureText(newText).width <= maxWidth) {
                text = newText;
                break;
            }
        }
    }
    return (0, element_3.newElementWith)(element, { text, width: maxWidth });
};
/**
 * When exporting frames, we need to render frame labels which are currently
 * being rendered in DOM when editing. Adding the labels as regular text
 * elements seems like a simple hack. In the future we'll want to move to
 * proper canvas rendering, even within editor (instead of DOM).
 */
const addFrameLabelsAsTextElements = (elements, opts) => {
    const nextElements = [];
    for (const element of elements) {
        if ((0, element_4.isFrameLikeElement)(element)) {
            let textElement = (0, element_7.newTextElement)({
                x: element.x,
                y: element.y - common_1.FRAME_STYLE.nameOffsetY,
                fontFamily: common_1.FONT_FAMILY.Helvetica,
                fontSize: common_1.FRAME_STYLE.nameFontSize,
                lineHeight: common_1.FRAME_STYLE.nameLineHeight,
                strokeColor: opts.exportWithDarkMode
                    ? common_1.FRAME_STYLE.nameColorDarkTheme
                    : common_1.FRAME_STYLE.nameColorLightTheme,
                text: (0, element_5.getFrameLikeTitle)(element),
            });
            textElement.y -= textElement.height;
            textElement = truncateText(textElement, element.width);
            nextElements.push(textElement);
        }
        nextElements.push(element);
    }
    return nextElements;
};
const getFrameRenderingConfig = (exportingFrame, frameRendering) => {
    frameRendering = frameRendering || (0, appState_1.getDefaultAppState)().frameRendering;
    return {
        enabled: exportingFrame ? true : frameRendering.enabled,
        outline: exportingFrame ? false : frameRendering.outline,
        name: exportingFrame ? false : frameRendering.name,
        clip: exportingFrame ? true : frameRendering.clip,
    };
};
const prepareElementsForRender = ({ elements, exportingFrame, frameRendering, exportWithDarkMode, }) => {
    let nextElements;
    if (exportingFrame) {
        nextElements = (0, element_5.getElementsOverlappingFrame)(elements, exportingFrame, (0, common_1.arrayToMap)(elements));
    }
    else if (frameRendering.enabled && frameRendering.name) {
        nextElements = addFrameLabelsAsTextElements(elements, {
            exportWithDarkMode,
        });
    }
    else {
        nextElements = elements;
    }
    return nextElements;
};
const exportToCanvas = async (elements, appState, files, { exportBackground, exportPadding = common_1.DEFAULT_EXPORT_PADDING, viewBackgroundColor, exportingFrame, }, createCanvas = (width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width * appState.exportScale;
    canvas.height = height * appState.exportScale;
    return { canvas, scale: appState.exportScale };
}, loadFonts = async () => {
    await fonts_1.Fonts.loadElementsFonts(elements);
}) => {
    // load font faces before continuing, by default leverages browsers' [FontFace API](https://developer.mozilla.org/en-US/docs/Web/API/FontFace)
    await loadFonts();
    const frameRendering = getFrameRenderingConfig(exportingFrame ?? null, appState.frameRendering ?? null);
    // for canvas export, don't clip if exporting a specific frame as it would
    // clip the corners of the content
    if (exportingFrame) {
        frameRendering.clip = false;
    }
    const elementsForRender = prepareElementsForRender({
        elements,
        exportingFrame,
        exportWithDarkMode: appState.exportWithDarkMode,
        frameRendering,
    });
    if (exportingFrame) {
        exportPadding = 0;
    }
    const [minX, minY, width, height] = getCanvasSize(exportingFrame ? [exportingFrame] : (0, element_5.getRootElements)(elementsForRender), exportPadding);
    const { canvas, scale = 1 } = createCanvas(width, height);
    const defaultAppState = (0, appState_1.getDefaultAppState)();
    const { imageCache } = await (0, element_2.updateImageCache)({
        imageCache: new Map(),
        fileIds: (0, element_2.getInitializedImageElements)(elementsForRender).map((element) => element.fileId),
        files,
    });
    (0, staticScene_1.renderStaticScene)({
        canvas,
        rc: rough_1.default.canvas(canvas),
        elementsMap: (0, common_1.toBrandedType)((0, common_1.arrayToMap)(elementsForRender)),
        allElementsMap: (0, common_1.toBrandedType)((0, common_1.arrayToMap)((0, element_6.syncInvalidIndices)(elements))),
        visibleElements: elementsForRender,
        scale,
        appState: {
            ...appState,
            frameRendering,
            viewBackgroundColor: exportBackground ? viewBackgroundColor : null,
            scrollX: -minX + exportPadding,
            scrollY: -minY + exportPadding,
            zoom: defaultAppState.zoom,
            shouldCacheIgnoreZoom: false,
            theme: appState.exportWithDarkMode ? common_1.THEME.DARK : common_1.THEME.LIGHT,
        },
        renderConfig: {
            canvasBackgroundColor: viewBackgroundColor,
            imageCache,
            renderGrid: false,
            isExporting: true,
            // empty disables embeddable rendering
            embedsValidationStatus: new Map(),
            elementsPendingErasure: new Set(),
            pendingFlowchartNodes: null,
            theme: appState.exportWithDarkMode ? common_1.THEME.DARK : common_1.THEME.LIGHT,
        },
    });
    return canvas;
};
exports.exportToCanvas = exportToCanvas;
const createHTMLComment = (text) => {
    // surrounding with spaces to maintain prettified consistency with previous
    // iterations
    // <!-- comment -->
    return document.createComment(` ${text} `);
};
const exportToSvg = async (elements, appState, files, opts) => {
    const frameRendering = getFrameRenderingConfig(opts?.exportingFrame ?? null, appState.frameRendering ?? null);
    let { exportPadding = common_1.DEFAULT_EXPORT_PADDING, exportWithDarkMode = false, viewBackgroundColor, exportScale = 1, exportEmbedScene, } = appState;
    const { exportingFrame = null } = opts || {};
    const elementsForRender = prepareElementsForRender({
        elements,
        exportingFrame,
        exportWithDarkMode,
        frameRendering,
    });
    if (exportingFrame) {
        exportPadding = 0;
    }
    const [minX, minY, width, height] = getCanvasSize(exportingFrame ? [exportingFrame] : (0, element_5.getRootElements)(elementsForRender), exportPadding);
    const offsetX = -minX + exportPadding;
    const offsetY = -minY + exportPadding;
    // ---------------------------------------------------------------------------
    // initialize SVG root element
    // ---------------------------------------------------------------------------
    const svgRoot = document.createElementNS(common_1.SVG_NS, "svg");
    svgRoot.setAttribute("version", "1.1");
    svgRoot.setAttribute("xmlns", common_1.SVG_NS);
    svgRoot.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svgRoot.setAttribute("width", `${width * exportScale}`);
    svgRoot.setAttribute("height", `${height * exportScale}`);
    const defsElement = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "defs");
    const metadataElement = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "metadata");
    svgRoot.appendChild(createHTMLComment("svg-source:excalidraw"));
    svgRoot.appendChild(metadataElement);
    svgRoot.appendChild(defsElement);
    // ---------------------------------------------------------------------------
    // scene embed
    // ---------------------------------------------------------------------------
    // we need to serialize the "original" elements before we put them through
    // the tempScene hack which duplicates and regenerates ids
    if (exportEmbedScene) {
        try {
            (0, exports.encodeSvgBase64Payload)({
                metadataElement,
                // when embedding scene, we want to embed the origionally supplied
                // elements which don't contain the temp frame labels.
                // But it also requires that the exportToSvg is being supplied with
                // only the elements that we're exporting, and no extra.
                payload: (0, json_1.serializeAsJSON)(elements, appState, files || {}, "local"),
            });
        }
        catch (error) {
            console.error(error);
        }
    }
    // ---------------------------------------------------------------------------
    // frame clip paths
    // ---------------------------------------------------------------------------
    const frameElements = (0, element_5.getFrameLikeElements)(elements);
    if (frameElements.length) {
        const elementsMap = (0, common_1.arrayToMap)(elements);
        for (const frame of frameElements) {
            const clipPath = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "clipPath");
            clipPath.setAttribute("id", frame.id);
            const [x1, y1, x2, y2] = (0, element_1.getElementAbsoluteCoords)(frame, elementsMap);
            const cx = (x2 - x1) / 2 - (frame.x - x1);
            const cy = (y2 - y1) / 2 - (frame.y - y1);
            const rect = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "rect");
            rect.setAttribute("transform", `translate(${frame.x + offsetX} ${frame.y + offsetY}) rotate(${frame.angle} ${cx} ${cy})`);
            rect.setAttribute("width", `${frame.width}`);
            rect.setAttribute("height", `${frame.height}`);
            if (!exportingFrame) {
                rect.setAttribute("rx", `${common_1.FRAME_STYLE.radius}`);
                rect.setAttribute("ry", `${common_1.FRAME_STYLE.radius}`);
            }
            clipPath.appendChild(rect);
            defsElement.appendChild(clipPath);
        }
    }
    // ---------------------------------------------------------------------------
    // inline font faces
    // ---------------------------------------------------------------------------
    const fontFaces = !opts?.skipInliningFonts
        ? await fonts_1.Fonts.generateFontFaceDeclarations(elements)
        : [];
    const delimiter = "\n      "; // 6 spaces
    const style = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "style");
    style.classList.add("style-fonts");
    style.appendChild(document.createTextNode(`${delimiter}${fontFaces.join(delimiter)}`));
    defsElement.appendChild(style);
    // ---------------------------------------------------------------------------
    // background
    // ---------------------------------------------------------------------------
    // render background rect
    if (appState.exportBackground && viewBackgroundColor) {
        const rect = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "rect");
        rect.setAttribute("x", "0");
        rect.setAttribute("y", "0");
        rect.setAttribute("width", `${width}`);
        rect.setAttribute("height", `${height}`);
        rect.setAttribute("fill", exportWithDarkMode
            ? (0, common_1.applyDarkModeFilter)(viewBackgroundColor)
            : viewBackgroundColor);
        svgRoot.appendChild(rect);
    }
    // ---------------------------------------------------------------------------
    // render elements
    // ---------------------------------------------------------------------------
    const rsvg = rough_1.default.svg(svgRoot);
    const renderEmbeddables = opts?.renderEmbeddables ?? false;
    (0, staticSvgScene_1.renderSceneToSvg)(elementsForRender, (0, common_1.toBrandedType)((0, common_1.arrayToMap)(elementsForRender)), rsvg, svgRoot, files || {}, {
        offsetX,
        offsetY,
        isExporting: true,
        exportWithDarkMode,
        renderEmbeddables,
        frameRendering,
        canvasBackgroundColor: viewBackgroundColor,
        embedsValidationStatus: renderEmbeddables
            ? new Map(elementsForRender
                .filter((element) => (0, element_4.isFrameLikeElement)(element))
                .map((element) => [element.id, true]))
            : new Map(),
        reuseImages: opts?.reuseImages ?? true,
        theme: exportWithDarkMode ? common_1.THEME.DARK : common_1.THEME.LIGHT,
    });
    // ---------------------------------------------------------------------------
    return svgRoot;
};
exports.exportToSvg = exportToSvg;
const encodeSvgBase64Payload = ({ payload, metadataElement, }) => {
    const base64 = (0, encode_1.stringToBase64)(JSON.stringify((0, encode_1.encode)({ text: payload })), true /* is already byte string */);
    metadataElement.appendChild(createHTMLComment(`payload-type:${common_1.MIME_TYPES.excalidraw}`));
    metadataElement.appendChild(createHTMLComment("payload-version:2"));
    metadataElement.appendChild(createHTMLComment("payload-start"));
    metadataElement.appendChild(document.createTextNode(base64));
    metadataElement.appendChild(createHTMLComment("payload-end"));
};
exports.encodeSvgBase64Payload = encodeSvgBase64Payload;
const decodeSvgBase64Payload = ({ svg }) => {
    if (svg.includes(`payload-type:${common_1.MIME_TYPES.excalidraw}`)) {
        const match = svg.match(/<!-- payload-start -->\s*(.+?)\s*<!-- payload-end -->/);
        if (!match) {
            throw new Error("INVALID");
        }
        const versionMatch = svg.match(/<!-- payload-version:(\d+) -->/);
        const version = versionMatch?.[1] || "1";
        const isByteString = version !== "1";
        try {
            const json = (0, encode_1.base64ToString)(match[1], isByteString);
            const encodedData = JSON.parse(json);
            if (!("encoded" in encodedData)) {
                // legacy, un-encoded scene JSON
                if ("type" in encodedData &&
                    encodedData.type === common_1.EXPORT_DATA_TYPES.excalidraw) {
                    return json;
                }
                throw new Error("FAILED");
            }
            return (0, encode_1.decode)(encodedData);
        }
        catch (error) {
            console.error(error);
            throw new Error("FAILED");
        }
    }
    throw new Error("INVALID");
};
exports.decodeSvgBase64Payload = decodeSvgBase64Payload;
// calculate smallest area to fit the contents in
const getCanvasSize = (elements, exportPadding) => {
    const [minX, minY, maxX, maxY] = (0, element_1.getCommonBounds)(elements);
    const width = (0, common_1.distance)(minX, maxX) + exportPadding * 2;
    const height = (0, common_1.distance)(minY, maxY) + exportPadding * 2;
    return [minX, minY, width, height];
};
const getExportSize = (elements, exportPadding, scale) => {
    const [, , width, height] = getCanvasSize(elements, exportPadding).map((dimension) => Math.trunc(dimension * scale));
    return [width, height];
};
exports.getExportSize = getExportSize;
