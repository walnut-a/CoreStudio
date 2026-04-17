"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resaveAsImageWithScene = void 0;
const blob_1 = require("./blob");
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
const _1 = require(".");
const resaveAsImageWithScene = async (data, fileHandle, filename) => {
    const fileHandleType = (0, blob_1.getFileHandleType)(fileHandle);
    if (!(0, blob_1.isImageFileHandleType)(fileHandleType)) {
        throw new Error("fileHandle should exist and should be of type svg or png when resaving");
    }
    let { elements, appState, files } = await data;
    const { exportBackground, viewBackgroundColor } = appState;
    appState = {
        ...appState,
        exportEmbedScene: true,
    };
    const { exportedElements, exportingFrame } = (0, _1.prepareElementsForExport)(elements, appState, false);
    await (0, _1.exportCanvas)(fileHandleType, exportedElements, appState, files, {
        exportBackground,
        viewBackgroundColor,
        name: filename,
        fileHandle,
        exportingFrame,
    });
    return { fileHandle };
};
exports.resaveAsImageWithScene = resaveAsImageWithScene;
