"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveLibraryAsJSON = exports.serializeLibraryAsJSON = exports.isValidLibrary = exports.isValidExcalidrawData = exports.loadFromJSON = exports.saveAsJSON = exports.serializeAsJSON = void 0;
const common_1 = require("@excalidraw/common");
const appState_1 = require("../appState");
const blob_1 = require("./blob");
const filesystem_1 = require("./filesystem");
/**
 * Strips out files which are only referenced by deleted elements
 */
const filterOutDeletedFiles = (elements, files) => {
    const nextFiles = {};
    for (const element of elements) {
        if (!element.isDeleted &&
            "fileId" in element &&
            element.fileId &&
            files[element.fileId]) {
            nextFiles[element.fileId] = files[element.fileId];
        }
    }
    return nextFiles;
};
const serializeAsJSON = (elements, appState, files, type) => {
    const data = {
        type: common_1.EXPORT_DATA_TYPES.excalidraw,
        version: common_1.VERSIONS.excalidraw,
        source: (0, common_1.getExportSource)(),
        elements,
        appState: type === "local"
            ? (0, appState_1.cleanAppStateForExport)(appState)
            : (0, appState_1.clearAppStateForDatabase)(appState),
        files: type === "local"
            ? filterOutDeletedFiles(elements, files)
            : // will be stripped from JSON
                undefined,
    };
    return JSON.stringify(data, null, 2);
};
exports.serializeAsJSON = serializeAsJSON;
const saveAsJSON = async ({ data, filename, fileHandle, }) => {
    const blob = Promise.resolve(data).then(({ elements, appState, files }) => {
        const serialized = (0, exports.serializeAsJSON)(elements, appState, files, "local");
        return new Blob([serialized], {
            type: common_1.MIME_TYPES.excalidraw,
        });
    });
    const savedFileHandle = await (0, filesystem_1.fileSave)(blob, {
        name: filename,
        extension: "excalidraw",
        description: "Excalidraw file",
        fileHandle: (0, blob_1.isImageFileHandle)(fileHandle) ? null : fileHandle,
    });
    return { fileHandle: savedFileHandle };
};
exports.saveAsJSON = saveAsJSON;
const loadFromJSON = async (localAppState, localElements) => {
    const file = await (0, filesystem_1.fileOpen)({
        description: "Excalidraw files",
        // ToDo: Be over-permissive until https://bugs.webkit.org/show_bug.cgi?id=34442
        // gets resolved. Else, iOS users cannot open `.excalidraw` files.
        // extensions: ["json", "excalidraw", "png", "svg"],
    });
    return (0, blob_1.loadFromBlob)(file, localAppState, localElements, file.handle);
};
exports.loadFromJSON = loadFromJSON;
const isValidExcalidrawData = (data) => {
    return (data?.type === common_1.EXPORT_DATA_TYPES.excalidraw &&
        (!data.elements ||
            (Array.isArray(data.elements) &&
                (!data.appState || typeof data.appState === "object"))));
};
exports.isValidExcalidrawData = isValidExcalidrawData;
const isValidLibrary = (json) => {
    return (typeof json === "object" &&
        json &&
        json.type === common_1.EXPORT_DATA_TYPES.excalidrawLibrary &&
        (json.version === 1 || json.version === 2));
};
exports.isValidLibrary = isValidLibrary;
const serializeLibraryAsJSON = (libraryItems) => {
    const data = {
        type: common_1.EXPORT_DATA_TYPES.excalidrawLibrary,
        version: common_1.VERSIONS.excalidrawLibrary,
        source: (0, common_1.getExportSource)(),
        libraryItems,
    };
    return JSON.stringify(data, null, 2);
};
exports.serializeLibraryAsJSON = serializeLibraryAsJSON;
const saveLibraryAsJSON = async (libraryItems) => {
    const serialized = (0, exports.serializeLibraryAsJSON)(libraryItems);
    await (0, filesystem_1.fileSave)(new Blob([serialized], {
        type: common_1.MIME_TYPES.excalidrawlib,
    }), {
        name: "library",
        extension: "excalidrawlib",
        description: "Excalidraw library file",
    });
};
exports.saveLibraryAsJSON = saveLibraryAsJSON;
