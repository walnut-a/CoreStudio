"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportToClipboard = exports.exportToSvg = exports.exportToBlob = exports.exportToCanvas = exports.MIME_TYPES = void 0;
const common_1 = require("@excalidraw/common");
Object.defineProperty(exports, "MIME_TYPES", { enumerable: true, get: function () { return common_1.MIME_TYPES; } });
const appState_1 = require("@excalidraw/excalidraw/appState");
const clipboard_1 = require("@excalidraw/excalidraw/clipboard");
const image_1 = require("@excalidraw/excalidraw/data/image");
const json_1 = require("@excalidraw/excalidraw/data/json");
const restore_1 = require("@excalidraw/excalidraw/data/restore");
const export_1 = require("@excalidraw/excalidraw/scene/export");
const exportToCanvas = ({ elements, appState, files, maxWidthOrHeight, getDimensions, exportPadding, exportingFrame, }) => {
    const restoredElements = (0, restore_1.restoreElements)(elements, null, {
        deleteInvisibleElements: true,
    });
    const restoredAppState = (0, restore_1.restoreAppState)(appState, null);
    const { exportBackground, viewBackgroundColor } = restoredAppState;
    return (0, export_1.exportToCanvas)(restoredElements, { ...restoredAppState, offsetTop: 0, offsetLeft: 0, width: 0, height: 0 }, files || {}, { exportBackground, exportPadding, viewBackgroundColor, exportingFrame }, (width, height) => {
        const canvas = document.createElement("canvas");
        if (maxWidthOrHeight) {
            if (typeof getDimensions === "function") {
                console.warn("`getDimensions()` is ignored when `maxWidthOrHeight` is supplied.");
            }
            const max = Math.max(width, height);
            // if content is less then maxWidthOrHeight, fallback on supplied scale
            const scale = maxWidthOrHeight < max
                ? maxWidthOrHeight / max
                : appState?.exportScale ?? 1;
            canvas.width = width * scale;
            canvas.height = height * scale;
            return {
                canvas,
                scale,
            };
        }
        const ret = getDimensions?.(width, height) || { width, height };
        canvas.width = ret.width;
        canvas.height = ret.height;
        return {
            canvas,
            scale: ret.scale ?? 1,
        };
    });
};
exports.exportToCanvas = exportToCanvas;
const exportToBlob = async (opts) => {
    let { mimeType = common_1.MIME_TYPES.png, quality } = opts;
    if (mimeType === common_1.MIME_TYPES.png && typeof quality === "number") {
        console.warn(`"quality" will be ignored for "${common_1.MIME_TYPES.png}" mimeType`);
    }
    // typo in MIME type (should be "jpeg")
    if (mimeType === "image/jpg") {
        mimeType = common_1.MIME_TYPES.jpg;
    }
    if (mimeType === common_1.MIME_TYPES.jpg && !opts.appState?.exportBackground) {
        console.warn(`Defaulting "exportBackground" to "true" for "${common_1.MIME_TYPES.jpg}" mimeType`);
        opts = {
            ...opts,
            appState: { ...opts.appState, exportBackground: true },
        };
    }
    const canvas = await (0, exports.exportToCanvas)(opts);
    quality = quality ? quality : /image\/jpe?g/.test(mimeType) ? 0.92 : 0.8;
    return new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
            if (!blob) {
                return reject(new Error("couldn't export to blob"));
            }
            if (blob &&
                mimeType === common_1.MIME_TYPES.png &&
                opts.appState?.exportEmbedScene) {
                blob = await (0, image_1.encodePngMetadata)({
                    blob,
                    metadata: (0, json_1.serializeAsJSON)(
                    // NOTE as long as we're using the Scene hack, we need to ensure
                    // we pass the original, uncloned elements when serializing
                    // so that we keep ids stable
                    opts.elements, opts.appState, opts.files || {}, "local"),
                });
            }
            resolve(blob);
        }, mimeType, quality);
    });
};
exports.exportToBlob = exportToBlob;
const exportToSvg = async ({ elements, appState = (0, appState_1.getDefaultAppState)(), files = {}, exportPadding, renderEmbeddables, exportingFrame, skipInliningFonts, reuseImages, }) => {
    const restoredElements = (0, restore_1.restoreElements)(elements, null, {
        deleteInvisibleElements: true,
    });
    const restoredAppState = (0, restore_1.restoreAppState)(appState, null);
    const exportAppState = {
        ...restoredAppState,
        exportPadding,
    };
    return (0, export_1.exportToSvg)(restoredElements, exportAppState, files, {
        exportingFrame,
        renderEmbeddables,
        skipInliningFonts,
        reuseImages,
    });
};
exports.exportToSvg = exportToSvg;
const exportToClipboard = async (opts) => {
    if (opts.type === "svg") {
        const svg = await (0, exports.exportToSvg)(opts);
        await (0, clipboard_1.copyTextToSystemClipboard)(svg.outerHTML);
    }
    else if (opts.type === "png") {
        await (0, clipboard_1.copyBlobToClipboardAsPng)((0, exports.exportToBlob)(opts));
    }
    else if (opts.type === "json") {
        await (0, clipboard_1.copyToClipboard)(opts.elements, opts.files);
    }
    else {
        throw new Error("Invalid export type");
    }
};
exports.exportToClipboard = exportToClipboard;
