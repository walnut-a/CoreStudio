"use strict";
// -----------------------------------------------------------------------------
// ExcalidrawImageElement & related helpers
// -----------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSVG = exports.isHTMLSVGElement = exports.getInitializedImageElements = exports.updateImageCache = exports.loadHTMLImageElement = void 0;
const common_1 = require("@excalidraw/common");
const typeChecks_1 = require("./typeChecks");
const loadHTMLImageElement = (dataURL) => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            resolve(image);
        };
        image.onerror = (error) => {
            reject(error);
        };
        image.src = dataURL;
    });
};
exports.loadHTMLImageElement = loadHTMLImageElement;
/** NOTE: updates cache even if already populated with given image. Thus,
 * you should filter out the images upstream if you want to optimize this. */
const updateImageCache = async ({ fileIds, files, imageCache, }) => {
    const updatedFiles = new Map();
    const erroredFiles = new Map();
    await Promise.all(fileIds.reduce((promises, fileId) => {
        const fileData = files[fileId];
        if (fileData && !updatedFiles.has(fileId)) {
            updatedFiles.set(fileId, true);
            return promises.concat((async () => {
                try {
                    if (fileData.mimeType === common_1.MIME_TYPES.binary) {
                        throw new Error("Only images can be added to ImageCache");
                    }
                    const imagePromise = (0, exports.loadHTMLImageElement)(fileData.dataURL);
                    const data = {
                        image: imagePromise,
                        mimeType: fileData.mimeType,
                    };
                    // store the promise immediately to indicate there's an in-progress
                    // initialization
                    imageCache.set(fileId, data);
                    const image = await imagePromise;
                    imageCache.set(fileId, { ...data, image });
                }
                catch (error) {
                    erroredFiles.set(fileId, true);
                }
            })());
        }
        return promises;
    }, []));
    return {
        imageCache,
        /** includes errored files because they cache was updated nonetheless */
        updatedFiles,
        /** files that failed when creating HTMLImageElement */
        erroredFiles,
    };
};
exports.updateImageCache = updateImageCache;
const getInitializedImageElements = (elements) => elements.filter((element) => (0, typeChecks_1.isInitializedImageElement)(element));
exports.getInitializedImageElements = getInitializedImageElements;
const isHTMLSVGElement = (node) => {
    // lower-casing due to XML/HTML convention differences
    // https://johnresig.com/blog/nodename-case-sensitivity
    return node?.nodeName.toLowerCase() === "svg";
};
exports.isHTMLSVGElement = isHTMLSVGElement;
const normalizeSVG = (SVGString) => {
    const doc = new DOMParser().parseFromString(SVGString, common_1.MIME_TYPES.svg);
    const svg = doc.querySelector("svg");
    const errorNode = doc.querySelector("parsererror");
    if (errorNode || !(0, exports.isHTMLSVGElement)(svg)) {
        throw new Error("Invalid SVG");
    }
    else {
        if (!svg.hasAttribute("xmlns")) {
            svg.setAttribute("xmlns", common_1.SVG_NS);
        }
        let width = svg.getAttribute("width");
        let height = svg.getAttribute("height");
        // Do not use % or auto values for width/height
        // to avoid scaling issues when rendering at different sizes/zoom levels
        if (width?.includes("%") || width === "auto") {
            width = null;
        }
        if (height?.includes("%") || height === "auto") {
            height = null;
        }
        const viewBox = svg.getAttribute("viewBox");
        if (!width || !height) {
            width = width || "50";
            height = height || "50";
            if (viewBox) {
                const match = viewBox.match(/\d+ +\d+ +(\d+(?:\.\d+)?) +(\d+(?:\.\d+)?)/);
                if (match) {
                    [, width, height] = match;
                }
            }
            svg.setAttribute("width", width);
            svg.setAttribute("height", height);
        }
        // Make sure viewBox is set
        if (!viewBox) {
            svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        }
        return svg.outerHTML;
    }
};
exports.normalizeSVG = normalizeSVG;
