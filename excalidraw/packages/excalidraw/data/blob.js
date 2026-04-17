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
exports.blobToArrayBuffer = exports.normalizeFile = exports.createFile = exports.getFileHandle = exports.ImageURLToFile = exports.SVGStringToFile = exports.resizeImageFile = exports.dataURLToString = exports.dataURLToFile = exports.getDataURL_sync = exports.getDataURL = exports.generateIdFromFile = exports.canvasToBlob = exports.loadLibraryFromBlob = exports.parseLibraryJSON = exports.loadFromBlob = exports.loadSceneOrLibraryFromBlob = exports.isSupportedImageFile = exports.isSupportedImageFileType = exports.isImageFileHandle = exports.isImageFileHandleType = exports.getFileHandleType = exports.getMimeType = void 0;
const nanoid_1 = require("nanoid");
const common_1 = require("@excalidraw/common");
const appState_1 = require("../appState");
const errors_1 = require("../errors");
const scene_1 = require("../scene");
const export_1 = require("../scene/export");
const encode_1 = require("./encode");
const filesystem_1 = require("./filesystem");
const json_1 = require("./json");
const restore_1 = require("./restore");
const parseFileContents = async (blob) => {
    let contents;
    if (blob.type === common_1.MIME_TYPES.png) {
        try {
            return await (await Promise.resolve().then(() => __importStar(require("./image")))).decodePngMetadata(blob);
        }
        catch (error) {
            if (error.message === "INVALID") {
                throw new errors_1.ImageSceneDataError("Image doesn't contain scene", "IMAGE_NOT_CONTAINS_SCENE_DATA");
            }
            else {
                throw new errors_1.ImageSceneDataError("Error: cannot restore image");
            }
        }
    }
    else {
        if ("text" in Blob) {
            contents = await blob.text();
        }
        else {
            contents = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsText(blob, "utf8");
                reader.onloadend = () => {
                    if (reader.readyState === FileReader.DONE) {
                        resolve(reader.result);
                    }
                };
            });
        }
        if (blob.type === common_1.MIME_TYPES.svg) {
            try {
                return (0, export_1.decodeSvgBase64Payload)({
                    svg: contents,
                });
            }
            catch (error) {
                if (error.message === "INVALID") {
                    throw new errors_1.ImageSceneDataError("Image doesn't contain scene", "IMAGE_NOT_CONTAINS_SCENE_DATA");
                }
                else {
                    throw new errors_1.ImageSceneDataError("Error: cannot restore image");
                }
            }
        }
    }
    return contents;
};
const getMimeType = (blob) => {
    let name;
    if (typeof blob === "string") {
        name = blob;
    }
    else {
        if (blob.type) {
            return blob.type;
        }
        name = blob.name || "";
    }
    if (/\.(excalidraw|json)$/.test(name)) {
        return common_1.MIME_TYPES.json;
    }
    else if (/\.png$/.test(name)) {
        return common_1.MIME_TYPES.png;
    }
    else if (/\.jpe?g$/.test(name)) {
        return common_1.MIME_TYPES.jpg;
    }
    else if (/\.svg$/.test(name)) {
        return common_1.MIME_TYPES.svg;
    }
    else if (/\.excalidrawlib$/.test(name)) {
        return common_1.MIME_TYPES.excalidrawlib;
    }
    return "";
};
exports.getMimeType = getMimeType;
const getFileHandleType = (handle) => {
    if (!handle) {
        return null;
    }
    return handle.name.match(/\.(json|excalidraw|png|svg)$/)?.[1] || null;
};
exports.getFileHandleType = getFileHandleType;
const isImageFileHandleType = (type) => {
    return type === "png" || type === "svg";
};
exports.isImageFileHandleType = isImageFileHandleType;
const isImageFileHandle = (handle) => {
    const type = (0, exports.getFileHandleType)(handle);
    return type === "png" || type === "svg";
};
exports.isImageFileHandle = isImageFileHandle;
const isSupportedImageFileType = (type) => {
    return !!type && Object.values(common_1.IMAGE_MIME_TYPES).includes(type);
};
exports.isSupportedImageFileType = isSupportedImageFileType;
const isSupportedImageFile = (blob) => {
    const { type } = blob || {};
    return (0, exports.isSupportedImageFileType)(type);
};
exports.isSupportedImageFile = isSupportedImageFile;
const loadSceneOrLibraryFromBlob = async (blob, 
/** @see restore.localAppState */
localAppState, localElements, 
/** FileSystemFileHandle. Defaults to `blob.handle` if defined, otherwise null. */
fileHandle) => {
    const contents = await parseFileContents(blob);
    let data;
    try {
        try {
            data = JSON.parse(contents);
        }
        catch (error) {
            if ((0, exports.isSupportedImageFile)(blob)) {
                throw new errors_1.ImageSceneDataError("Image doesn't contain scene", "IMAGE_NOT_CONTAINS_SCENE_DATA");
            }
            throw error;
        }
        if ((0, json_1.isValidExcalidrawData)(data)) {
            return {
                type: common_1.MIME_TYPES.excalidraw,
                data: {
                    elements: (0, restore_1.restoreElements)(data.elements, localElements, {
                        repairBindings: true,
                        deleteInvisibleElements: true,
                    }),
                    appState: (0, restore_1.restoreAppState)({
                        theme: localAppState?.theme,
                        fileHandle: fileHandle || blob.handle || null,
                        ...(0, appState_1.cleanAppStateForExport)(data.appState || {}),
                        ...(localAppState
                            ? (0, scene_1.calculateScrollCenter)(data.elements || [], localAppState)
                            : {}),
                    }, localAppState),
                    files: data.files || {},
                },
            };
        }
        else if ((0, json_1.isValidLibrary)(data)) {
            return {
                type: common_1.MIME_TYPES.excalidrawlib,
                data,
            };
        }
        throw new Error("Error: invalid file");
    }
    catch (error) {
        if (error instanceof errors_1.ImageSceneDataError) {
            throw error;
        }
        throw new Error("Error: invalid file");
    }
};
exports.loadSceneOrLibraryFromBlob = loadSceneOrLibraryFromBlob;
const loadFromBlob = async (blob, 
/** @see restore.localAppState */
localAppState, localElements, 
/** FileSystemFileHandle. Defaults to `blob.handle` if defined, otherwise null. */
fileHandle) => {
    const ret = await (0, exports.loadSceneOrLibraryFromBlob)(blob, localAppState, localElements, fileHandle);
    if (ret.type !== common_1.MIME_TYPES.excalidraw) {
        throw new Error("Error: invalid file");
    }
    return ret.data;
};
exports.loadFromBlob = loadFromBlob;
const parseLibraryJSON = (json, defaultStatus = "unpublished") => {
    const data = JSON.parse(json);
    if (!(0, json_1.isValidLibrary)(data)) {
        throw new Error("Invalid library");
    }
    const libraryItems = data.libraryItems || data.library;
    return (0, restore_1.restoreLibraryItems)(libraryItems, defaultStatus);
};
exports.parseLibraryJSON = parseLibraryJSON;
const loadLibraryFromBlob = async (blob, defaultStatus = "unpublished") => {
    return (0, exports.parseLibraryJSON)(await parseFileContents(blob), defaultStatus);
};
exports.loadLibraryFromBlob = loadLibraryFromBlob;
const canvasToBlob = async (canvas) => {
    return new Promise(async (resolve, reject) => {
        try {
            if ((0, common_1.isPromiseLike)(canvas)) {
                canvas = await canvas;
            }
            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new errors_1.CanvasError("Error: Canvas too big", "CANVAS_POSSIBLY_TOO_BIG"));
                }
                resolve(blob);
            });
        }
        catch (error) {
            reject(error);
        }
    });
};
exports.canvasToBlob = canvasToBlob;
/** generates SHA-1 digest from supplied file (if not supported, falls back
    to a 40-char base64 random id) */
const generateIdFromFile = async (file) => {
    try {
        const hashBuffer = await window.crypto.subtle.digest("SHA-1", await (0, exports.blobToArrayBuffer)(file));
        return (0, common_1.bytesToHexString)(new Uint8Array(hashBuffer));
    }
    catch (error) {
        console.error(error);
        // length 40 to align with the HEX length of SHA-1 (which is 160 bit)
        return (0, nanoid_1.nanoid)(40);
    }
};
exports.generateIdFromFile = generateIdFromFile;
/** async. For sync variant, use getDataURL_sync */
const getDataURL = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataURL = reader.result;
            resolve(dataURL);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};
exports.getDataURL = getDataURL;
const getDataURL_sync = (data, mimeType) => {
    return `data:${mimeType};base64,${(0, encode_1.stringToBase64)((0, encode_1.toByteString)(data), true)}`;
};
exports.getDataURL_sync = getDataURL_sync;
const dataURLToFile = (dataURL, filename = "") => {
    const dataIndexStart = dataURL.indexOf(",");
    const byteString = atob(dataURL.slice(dataIndexStart + 1));
    const mimeType = dataURL.slice(0, dataIndexStart).split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new File([ab], filename, { type: mimeType });
};
exports.dataURLToFile = dataURLToFile;
const dataURLToString = (dataURL) => {
    return (0, encode_1.base64ToString)(dataURL.slice(dataURL.indexOf(",") + 1));
};
exports.dataURLToString = dataURLToString;
const resizeImageFile = async (file, opts) => {
    // SVG files shouldn't a can't be resized
    if (file.type === common_1.MIME_TYPES.svg) {
        return file;
    }
    const [pica, imageBlobReduce] = await Promise.all([
        Promise.resolve().then(() => __importStar(require("pica"))).then((res) => res.default),
        // a wrapper for pica for better API
        Promise.resolve().then(() => __importStar(require("image-blob-reduce"))).then((res) => res.default),
    ]);
    // CRA's minification settings break pica in WebWorkers, so let's disable
    // them for now
    // https://github.com/nodeca/image-blob-reduce/issues/21#issuecomment-757365513
    const reduce = imageBlobReduce({
        pica: pica({ features: ["js", "wasm"] }),
    });
    if (opts.outputType) {
        const { outputType } = opts;
        reduce._create_blob = function (env) {
            return this.pica.toBlob(env.out_canvas, outputType, 0.8).then((blob) => {
                env.out_blob = blob;
                return env;
            });
        };
    }
    if (!(0, exports.isSupportedImageFile)(file)) {
        throw new Error("Error: unsupported file type", { cause: "UNSUPPORTED" });
    }
    return new File([await reduce.toBlob(file, { max: opts.maxWidthOrHeight, alpha: true })], file.name, {
        type: opts.outputType || file.type,
    });
};
exports.resizeImageFile = resizeImageFile;
const SVGStringToFile = (SVGString, filename = "") => {
    return new File([new TextEncoder().encode(SVGString)], filename, {
        type: common_1.MIME_TYPES.svg,
    });
};
exports.SVGStringToFile = SVGStringToFile;
const ImageURLToFile = async (imageUrl, filename = "") => {
    let response;
    try {
        response = await fetch(imageUrl);
    }
    catch (error) {
        throw new Error("Error: failed to fetch image", { cause: "FETCH_ERROR" });
    }
    if (!response.ok) {
        throw new Error("Error: failed to fetch image", { cause: "FETCH_ERROR" });
    }
    const blob = await response.blob();
    if (blob.type && (0, exports.isSupportedImageFile)(blob)) {
        const name = filename || blob.name || "";
        return new File([blob], name, { type: blob.type });
    }
    throw new Error("Error: unsupported file type", { cause: "UNSUPPORTED" });
};
exports.ImageURLToFile = ImageURLToFile;
const getFileHandle = async (event) => {
    if (filesystem_1.nativeFileSystemSupported) {
        try {
            const dataTransferItem = event instanceof DataTransferItem
                ? event
                : event.dataTransfer?.items?.[0];
            const handle = (await dataTransferItem.getAsFileSystemHandle()) || null;
            return handle;
        }
        catch (error) {
            console.warn(error.name, error.message);
            return null;
        }
    }
    return null;
};
exports.getFileHandle = getFileHandle;
/**
 * attempts to detect if a buffer is a valid image by checking its leading bytes
 */
const getActualMimeTypeFromImage = async (file) => {
    let mimeType = null;
    const leadingBytes = [
        ...new Uint8Array(await (0, exports.blobToArrayBuffer)(file.slice(0, 15))),
    ].join(" ");
    // uint8 leading bytes
    const bytes = {
        // https://en.wikipedia.org/wiki/Portable_Network_Graphics#File_header
        png: /^137 80 78 71 13 10 26 10\b/,
        // https://en.wikipedia.org/wiki/JPEG#Syntax_and_structure
        // jpg is a bit wonky. Checking the first three bytes should be enough,
        // but may yield false positives. (https://stackoverflow.com/a/23360709/927631)
        jpg: /^255 216 255\b/,
        // https://en.wikipedia.org/wiki/GIF#Example_GIF_file
        gif: /^71 73 70 56 57 97\b/,
        // 4 bytes for RIFF + 4 bytes for chunk size + WEBP identifier
        webp: /^82 73 70 70 \d+ \d+ \d+ \d+ 87 69 66 80 86 80 56\b/,
    };
    for (const type of Object.keys(bytes)) {
        if (leadingBytes.match(bytes[type])) {
            mimeType = common_1.MIME_TYPES[type];
            break;
        }
    }
    return mimeType || file.type || null;
};
const createFile = (blob, mimeType, name) => {
    return new File([blob], name || "", {
        type: mimeType,
    });
};
exports.createFile = createFile;
const normalizedFileSymbol = Symbol("fileNormalized");
/** attempts to detect correct mimeType if none is set, or if an image
 * has an incorrect extension.
 * Note: doesn't handle missing .excalidraw/.excalidrawlib extension  */
const normalizeFile = async (file) => {
    // to prevent double normalization (perf optim)
    if (file[normalizedFileSymbol]) {
        return file;
    }
    if (file?.name?.endsWith(".excalidrawlib")) {
        file = (0, exports.createFile)(file, common_1.MIME_TYPES.excalidrawlib, file.name);
    }
    else if (file?.name?.endsWith(".excalidraw")) {
        file = (0, exports.createFile)(file, common_1.MIME_TYPES.excalidraw, file.name);
    }
    else if (!file.type || file.type?.startsWith("image/")) {
        // when the file is an image, make sure the extension corresponds to the
        // actual mimeType (this is an edge case, but happens - especially
        // with AI generated images)
        const mimeType = await getActualMimeTypeFromImage(file);
        if (mimeType && mimeType !== file.type) {
            file = (0, exports.createFile)(file, mimeType, file.name);
        }
    }
    file[normalizedFileSymbol] = true;
    return file;
};
exports.normalizeFile = normalizeFile;
const blobToArrayBuffer = (blob) => {
    if ("arrayBuffer" in blob) {
        return blob.arrayBuffer();
    }
    // Safari
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Couldn't convert blob to ArrayBuffer"));
            }
            resolve(event.target.result);
        };
        reader.readAsArrayBuffer(blob);
    });
};
exports.blobToArrayBuffer = blobToArrayBuffer;
