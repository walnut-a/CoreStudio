"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nativeFileSystemSupported = exports.fileSave = exports.fileOpen = void 0;
const browser_fs_access_1 = require("browser-fs-access");
Object.defineProperty(exports, "nativeFileSystemSupported", { enumerable: true, get: function () { return browser_fs_access_1.supported; } });
const common_1 = require("@excalidraw/common");
const blob_1 = require("./blob");
const fileOpen = async (opts) => {
    const mimeTypes = opts.extensions?.reduce((mimeTypes, type) => {
        mimeTypes.push(common_1.MIME_TYPES[type]);
        return mimeTypes;
    }, []);
    const extensions = opts.extensions?.reduce((acc, ext) => {
        if (ext === "jpg") {
            return acc.concat(".jpg", ".jpeg");
        }
        return acc.concat(`.${ext}`);
    }, []);
    const files = await (0, browser_fs_access_1.fileOpen)({
        description: opts.description,
        extensions,
        mimeTypes,
        multiple: opts.multiple ?? false,
    });
    if (Array.isArray(files)) {
        return (await Promise.all(files.map((file) => (0, blob_1.normalizeFile)(file))));
    }
    return (await (0, blob_1.normalizeFile)(files));
};
exports.fileOpen = fileOpen;
const fileSave = (blob, opts) => {
    return (0, browser_fs_access_1.fileSave)(blob, {
        fileName: `${opts.name}.${opts.extension}`,
        description: opts.description,
        extensions: [`.${opts.extension}`],
        mimeTypes: opts.mimeTypes,
    }, opts.fileHandle, false);
};
exports.fileSave = fileSave;
