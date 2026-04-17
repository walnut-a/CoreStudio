"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportCanvas = exports.prepareElementsForExport = exports.saveAsJSON = exports.loadFromJSON = exports.loadFromBlob = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const clipboard_1 = require("../clipboard");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const export_1 = require("../scene/export");
const blob_1 = require("./blob");
const filesystem_1 = require("./filesystem");
const json_1 = require("./json");
var blob_2 = require("./blob");
Object.defineProperty(exports, "loadFromBlob", { enumerable: true, get: function () { return blob_2.loadFromBlob; } });
var json_2 = require("./json");
Object.defineProperty(exports, "loadFromJSON", { enumerable: true, get: function () { return json_2.loadFromJSON; } });
Object.defineProperty(exports, "saveAsJSON", { enumerable: true, get: function () { return json_2.saveAsJSON; } });
const prepareElementsForExport = (elements, { selectedElementIds }, exportSelectionOnly) => {
    elements = (0, element_1.getNonDeletedElements)(elements);
    const elementsMap = (0, common_1.arrayToMap)(elements);
    const isExportingSelection = exportSelectionOnly &&
        (0, scene_1.isSomeElementSelected)(elements, { selectedElementIds });
    let exportingFrame = null;
    let exportedElements = isExportingSelection
        ? (0, scene_1.getSelectedElements)(elements, { selectedElementIds }, {
            includeBoundTextElement: true,
        })
        : elements;
    if (isExportingSelection) {
        if (exportedElements.length === 1 &&
            (0, element_2.isFrameLikeElement)(exportedElements[0])) {
            exportingFrame = exportedElements[0];
            exportedElements = (0, element_3.getElementsOverlappingFrame)(elements, exportingFrame, elementsMap);
        }
        else if (exportedElements.length > 1) {
            exportedElements = (0, scene_1.getSelectedElements)(elements, { selectedElementIds }, {
                includeBoundTextElement: true,
                includeElementsInFrames: true,
            });
        }
    }
    return {
        exportingFrame,
        exportedElements: (0, common_1.cloneJSON)(exportedElements),
    };
};
exports.prepareElementsForExport = prepareElementsForExport;
const exportCanvas = async (type, elements, appState, files, { exportBackground, exportPadding = common_1.DEFAULT_EXPORT_PADDING, viewBackgroundColor, name = appState.name || common_1.DEFAULT_FILENAME, fileHandle = null, exportingFrame = null, }) => {
    if (elements.length === 0) {
        throw new Error((0, i18n_1.t)("alerts.cannotExportEmptyCanvas"));
    }
    if (type === "svg" || type === "clipboard-svg") {
        const svgPromise = (0, export_1.exportToSvg)(elements, {
            exportBackground,
            exportWithDarkMode: appState.exportWithDarkMode,
            viewBackgroundColor,
            exportPadding,
            exportScale: appState.exportScale,
            exportEmbedScene: appState.exportEmbedScene && type === "svg",
        }, files, { exportingFrame });
        if (type === "svg") {
            return (0, filesystem_1.fileSave)(svgPromise.then((svg) => {
                // adding SVG preamble so that older software parse the SVG file
                // properly
                return new Blob([common_1.SVG_DOCUMENT_PREAMBLE + svg.outerHTML], {
                    type: common_1.MIME_TYPES.svg,
                });
            }), {
                description: "Export to SVG",
                name,
                extension: appState.exportEmbedScene ? "excalidraw.svg" : "svg",
                mimeTypes: [common_1.IMAGE_MIME_TYPES.svg],
                fileHandle,
            });
        }
        else if (type === "clipboard-svg") {
            const svg = await svgPromise.then((svg) => svg.outerHTML);
            try {
                await (0, clipboard_1.copyTextToSystemClipboard)(svg);
            }
            catch (e) {
                throw new Error((0, i18n_1.t)("errors.copyToSystemClipboardFailed"));
            }
            return;
        }
    }
    const tempCanvas = (0, export_1.exportToCanvas)(elements, appState, files, {
        exportBackground,
        viewBackgroundColor,
        exportPadding,
        exportingFrame,
    });
    if (type === "png") {
        let blob = (0, blob_1.canvasToBlob)(tempCanvas);
        if (appState.exportEmbedScene) {
            blob = blob.then((blob) => Promise.resolve().then(() => __importStar(require("./image"))).then(({ encodePngMetadata }) => encodePngMetadata({
                blob,
                metadata: (0, json_1.serializeAsJSON)(elements, appState, files, "local"),
            })));
        }
        return (0, filesystem_1.fileSave)(blob, {
            description: "Export to PNG",
            name,
            extension: appState.exportEmbedScene ? "excalidraw.png" : "png",
            mimeTypes: [common_1.IMAGE_MIME_TYPES.png],
            fileHandle,
        });
    }
    else if (type === "clipboard") {
        try {
            const blob = (0, blob_1.canvasToBlob)(tempCanvas);
            await (0, clipboard_1.copyBlobToClipboardAsPng)(blob);
        }
        catch (error) {
            console.warn(error);
            if (error.name === "CANVAS_POSSIBLY_TOO_BIG") {
                throw new Error((0, i18n_1.t)("canvasError.canvasTooBig"));
            }
            // TypeError *probably* suggests ClipboardItem not defined, which
            // people on Firefox can enable through a flag, so let's tell them.
            if (common_1.isFirefox && error.name === "TypeError") {
                throw new Error(`${(0, i18n_1.t)("alerts.couldNotCopyToClipboard")}\n\n${(0, i18n_1.t)("hints.firefox_clipboard_write")}`);
            }
            else {
                throw new Error((0, i18n_1.t)("alerts.couldNotCopyToClipboard"));
            }
        }
    }
    else {
        // shouldn't happen
        throw new Error("Unsupported export type");
    }
};
exports.exportCanvas = exportCanvas;
