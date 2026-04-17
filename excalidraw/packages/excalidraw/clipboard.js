"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isClipboardEvent = exports.copyTextToSystemClipboard = exports.copyBlobToClipboardAsPng = exports.parseClipboard = exports.parseDataTransferEvent = exports.parseDataTransferEventMimeTypes = exports.readSystemClipboard = exports.copyToClipboard = exports.serializeAsClipboardJSON = exports.createPasteEvent = exports.probablySupportsClipboardBlob = exports.probablySupportsClipboardWriteText = exports.probablySupportsClipboardReadText = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const errors_1 = require("./errors");
const blob_1 = require("./data/blob");
exports.probablySupportsClipboardReadText = "clipboard" in navigator && "readText" in navigator.clipboard;
exports.probablySupportsClipboardWriteText = "clipboard" in navigator && "writeText" in navigator.clipboard;
exports.probablySupportsClipboardBlob = "clipboard" in navigator &&
    "write" in navigator.clipboard &&
    "ClipboardItem" in window &&
    "toBlob" in HTMLCanvasElement.prototype;
const clipboardContainsElements = (contents) => {
    if ([
        common_1.EXPORT_DATA_TYPES.excalidraw,
        common_1.EXPORT_DATA_TYPES.excalidrawClipboard,
        common_1.EXPORT_DATA_TYPES.excalidrawClipboardWithAPI,
    ].includes(contents?.type) &&
        Array.isArray(contents.elements)) {
        return true;
    }
    return false;
};
const createPasteEvent = ({ types, files, }) => {
    if (!types && !files) {
        console.warn("createPasteEvent: no types or files provided");
    }
    const event = new ClipboardEvent(common_1.EVENT.PASTE, {
        clipboardData: new DataTransfer(),
    });
    if (types) {
        for (const [type, value] of Object.entries(types)) {
            if (typeof value !== "string") {
                files = files || [];
                files.push(value);
                continue;
            }
            try {
                event.clipboardData?.items.add(value, type);
                if (event.clipboardData?.getData(type) !== value) {
                    throw new Error(`Failed to set "${type}" as clipboardData item`);
                }
            }
            catch (error) {
                throw new Error(error.message);
            }
        }
    }
    if (files) {
        let idx = -1;
        for (const file of files) {
            idx++;
            try {
                event.clipboardData?.items.add(file);
                if (event.clipboardData?.files[idx] !== file) {
                    throw new Error(`Failed to set file "${file.name}" as clipboardData item`);
                }
            }
            catch (error) {
                throw new Error(error.message);
            }
        }
    }
    return event;
};
exports.createPasteEvent = createPasteEvent;
const serializeAsClipboardJSON = ({ elements, files, }) => {
    const elementsMap = (0, common_1.arrayToMap)(elements);
    const framesToCopy = new Set(elements.filter((element) => (0, element_3.isFrameLikeElement)(element)));
    let foundFile = false;
    const _files = elements.reduce((acc, element) => {
        if ((0, element_3.isInitializedImageElement)(element)) {
            foundFile = true;
            if (files && files[element.fileId]) {
                acc[element.fileId] = files[element.fileId];
            }
        }
        return acc;
    }, {});
    if (foundFile && !files) {
        console.warn("copyToClipboard: attempting to file element(s) without providing associated `files` object.");
    }
    // select bound text elements when copying
    const contents = {
        type: common_1.EXPORT_DATA_TYPES.excalidrawClipboard,
        elements: elements.map((element) => {
            if ((0, element_4.getContainingFrame)(element, elementsMap) &&
                !framesToCopy.has((0, element_4.getContainingFrame)(element, elementsMap))) {
                const copiedElement = (0, element_2.deepCopyElement)(element);
                (0, element_1.mutateElement)(copiedElement, elementsMap, {
                    frameId: null,
                });
                return copiedElement;
            }
            return element;
        }),
        files: files ? _files : undefined,
    };
    return JSON.stringify(contents);
};
exports.serializeAsClipboardJSON = serializeAsClipboardJSON;
const copyToClipboard = async (elements, files, 
/** supply if available to make the operation more certain to succeed */
clipboardEvent) => {
    const json = (0, exports.serializeAsClipboardJSON)({ elements, files });
    await (0, exports.copyTextToSystemClipboard)({
        [common_1.MIME_TYPES.excalidrawClipboard]: json,
        [common_1.MIME_TYPES.text]: json,
    }, clipboardEvent);
};
exports.copyToClipboard = copyToClipboard;
/** internal, specific to parsing paste events. Do not reuse. */
function parseHTMLTree(el) {
    let result = [];
    for (const node of el.childNodes) {
        if (node.nodeType === 3) {
            const text = node.textContent?.trim();
            if (text) {
                result.push({ type: "text", value: text });
            }
        }
        else if (node instanceof HTMLImageElement) {
            const url = node.getAttribute("src");
            if (url && url.startsWith("http")) {
                result.push({ type: "imageUrl", value: url });
            }
        }
        else {
            result = result.concat(parseHTMLTree(node));
        }
    }
    return result;
}
const maybeParseHTMLDataItem = (dataItem) => {
    const html = dataItem.value;
    try {
        const doc = new DOMParser().parseFromString(html, common_1.MIME_TYPES.html);
        const content = parseHTMLTree(doc.body);
        if (content.length) {
            return { type: "mixedContent", value: content };
        }
    }
    catch (error) {
        console.error(`error in parseHTMLFromPaste: ${error.message}`);
    }
    return null;
};
/**
 * Reads OS clipboard programmatically. May not work on all browsers.
 * Will prompt user for permission if not granted.
 */
const readSystemClipboard = async () => {
    const types = {};
    let clipboardItems;
    try {
        clipboardItems = await navigator.clipboard?.read();
    }
    catch (error) {
        try {
            if (navigator.clipboard?.readText) {
                console.warn(`navigator.clipboard.readText() failed (${error.message}). Failling back to navigator.clipboard.read()`);
                const readText = await navigator.clipboard?.readText();
                if (readText) {
                    return { [common_1.MIME_TYPES.text]: readText };
                }
            }
        }
        catch (error) {
            // @ts-ignore
            if (navigator.clipboard?.read) {
                console.warn(`navigator.clipboard.readText() failed (${error.message}). Failling back to navigator.clipboard.read()`);
            }
            else {
                if (error.name === "DataError") {
                    console.warn(`navigator.clipboard.read() error, clipboard is probably empty: ${error.message}`);
                    return types;
                }
                throw error;
            }
        }
        throw error;
    }
    for (const item of clipboardItems) {
        for (const type of item.types) {
            if (!(0, common_1.isMemberOf)(common_1.ALLOWED_PASTE_MIME_TYPES, type)) {
                continue;
            }
            try {
                if (type === common_1.MIME_TYPES.text || type === common_1.MIME_TYPES.html) {
                    types[type] = await (await item.getType(type)).text();
                }
                else if ((0, blob_1.isSupportedImageFileType)(type)) {
                    const imageBlob = await item.getType(type);
                    const file = (0, blob_1.createFile)(imageBlob, type, undefined);
                    types[type] = file;
                }
                else {
                    throw new errors_1.ExcalidrawError(`Unsupported clipboard type: ${type}`);
                }
            }
            catch (error) {
                console.warn(error instanceof errors_1.ExcalidrawError
                    ? error.message
                    : `Cannot retrieve ${type} from clipboardItem: ${error.message}`);
            }
        }
    }
    if (Object.keys(types).length === 0) {
        console.warn("No clipboard data found from clipboard.read().");
        return types;
    }
    return types;
};
exports.readSystemClipboard = readSystemClipboard;
/**
 * Parses "paste" ClipboardEvent.
 */
const parseClipboardEventTextData = async (dataList, isPlainPaste = false) => {
    try {
        const htmlItem = dataList.findByType(common_1.MIME_TYPES.html);
        const mixedContent = !isPlainPaste && htmlItem && maybeParseHTMLDataItem(htmlItem);
        if (mixedContent) {
            if (mixedContent.value.every((item) => item.type === "text")) {
                return {
                    type: "text",
                    value: dataList.getData(common_1.MIME_TYPES.text) ??
                        mixedContent.value
                            .map((item) => item.value)
                            .join("\n")
                            .trim(),
                };
            }
            return mixedContent;
        }
        return {
            type: "text",
            value: (dataList.getData(common_1.MIME_TYPES.text) || "").trim(),
        };
    }
    catch {
        return { type: "text", value: "" };
    }
};
const findDataTransferItemType = function (type) {
    return (this.find((item) => item.type === type) || null);
};
const getDataTransferItemData = function (type) {
    const item = this.find((item) => item.type === type);
    return item?.value ?? null;
};
const getDataTransferFiles = function () {
    return this.filter((item) => item.kind === "file");
};
/** @returns list of MIME types, synchronously */
const parseDataTransferEventMimeTypes = (event) => {
    let items = undefined;
    if ((0, exports.isClipboardEvent)(event)) {
        items = event.clipboardData?.items;
    }
    else {
        items = event.dataTransfer?.items;
    }
    const types = new Set();
    for (const item of Array.from(items || [])) {
        if (!types.has(item.type)) {
            types.add(item.type);
        }
    }
    return types;
};
exports.parseDataTransferEventMimeTypes = parseDataTransferEventMimeTypes;
const parseDataTransferEvent = async (event) => {
    let items = undefined;
    if ((0, exports.isClipboardEvent)(event)) {
        items = event.clipboardData?.items;
    }
    else {
        items = event.dataTransfer?.items;
    }
    const dataItems = (await Promise.all(Array.from(items || []).map(async (item) => {
        if (item.kind === "file") {
            let file = item.getAsFile();
            if (file) {
                const fileHandle = await (0, blob_1.getFileHandle)(item);
                file = await (0, blob_1.normalizeFile)(file);
                return {
                    type: file.type,
                    kind: "file",
                    file,
                    fileHandle,
                };
            }
        }
        else if (item.kind === "string") {
            const { type } = item;
            let value;
            if ("clipboardData" in event && event.clipboardData) {
                value = event.clipboardData?.getData(type);
            }
            else {
                value = await new Promise((resolve) => {
                    item.getAsString((str) => resolve(str));
                });
            }
            return { type, kind: "string", value };
        }
        return null;
    }))).filter((data) => data != null);
    return Object.assign(dataItems, {
        findByType: findDataTransferItemType,
        getData: getDataTransferItemData,
        getFiles: getDataTransferFiles,
    });
};
exports.parseDataTransferEvent = parseDataTransferEvent;
/**
 * Attempts to parse clipboard event.
 */
const parseClipboard = async (dataList, isPlainPaste = false) => {
    const parsedEventData = await parseClipboardEventTextData(dataList, isPlainPaste);
    if (parsedEventData.type === "mixedContent") {
        return {
            mixedContent: parsedEventData.value,
        };
    }
    try {
        const systemClipboardData = JSON.parse(parsedEventData.value);
        const programmaticAPI = systemClipboardData.type === common_1.EXPORT_DATA_TYPES.excalidrawClipboardWithAPI;
        if (clipboardContainsElements(systemClipboardData)) {
            return {
                elements: systemClipboardData.elements,
                files: systemClipboardData.files,
                text: isPlainPaste
                    ? JSON.stringify(systemClipboardData.elements, null, 2)
                    : undefined,
                programmaticAPI,
            };
        }
    }
    catch { }
    return { text: parsedEventData.value };
};
exports.parseClipboard = parseClipboard;
const copyBlobToClipboardAsPng = async (blob) => {
    try {
        // in Safari so far we need to construct the ClipboardItem synchronously
        // (i.e. in the same tick) otherwise browser will complain for lack of
        // user intent. Using a Promise ClipboardItem constructor solves this.
        // https://bugs.webkit.org/show_bug.cgi?id=222262
        //
        // Note that Firefox (and potentially others) seems to support Promise
        // ClipboardItem constructor, but throws on an unrelated MIME type error.
        // So we need to await this and fallback to awaiting the blob if applicable.
        await navigator.clipboard.write([
            new ClipboardItem({
                [common_1.MIME_TYPES.png]: blob,
            }),
        ]);
    }
    catch (error) {
        // if we're using a Promise ClipboardItem, let's try constructing
        // with resolution value instead
        if ((0, common_1.isPromiseLike)(blob)) {
            await navigator.clipboard.write([
                new ClipboardItem({
                    [common_1.MIME_TYPES.png]: await blob,
                }),
            ]);
        }
        else {
            throw error;
        }
    }
};
exports.copyBlobToClipboardAsPng = copyBlobToClipboardAsPng;
const copyTextToSystemClipboard = async (text, clipboardEvent) => {
    text = text || "";
    const entries = Object.entries(typeof text === "string" ? { [common_1.MIME_TYPES.text]: text } : text);
    // (1) if we have clipboardEvent, try using it first as it's the most
    // versatile
    try {
        if (clipboardEvent) {
            for (const [mimeType, value] of entries) {
                clipboardEvent.clipboardData?.setData(mimeType, value);
                if (clipboardEvent.clipboardData?.getData(mimeType) !== value) {
                    throw new Error("Failed to setData on clipboardEvent");
                }
            }
            return;
        }
    }
    catch (error) {
        console.error(error);
    }
    const plainTextEntry = entries.find(([mimeType]) => mimeType === common_1.MIME_TYPES.text);
    // (2) if we don't have access to clipboardEvent, or that fails,
    // at least try setting text/plain via navigator.clipboard.writeText
    // (navigator.clipboard.write doesn't work with non-standard mime types)
    if (exports.probablySupportsClipboardWriteText && plainTextEntry) {
        try {
            // NOTE: doesn't work on FF on non-HTTPS domains, or when document
            // not focused
            await navigator.clipboard.writeText(plainTextEntry[1]);
            return;
        }
        catch (error) {
            console.error(error);
        }
    }
    // (3) if previous fails, use document.execCommand
    if (plainTextEntry && !copyTextViaExecCommand(plainTextEntry[1])) {
        throw new Error("Error copying to clipboard.");
    }
};
exports.copyTextToSystemClipboard = copyTextToSystemClipboard;
// adapted from https://github.com/zenorocha/clipboard.js/blob/ce79f170aa655c408b6aab33c9472e8e4fa52e19/src/clipboard-action.js#L48
const copyTextViaExecCommand = (text) => {
    // execCommand doesn't allow copying empty strings, so if we're
    // clearing clipboard using this API, we must copy at least an empty char
    if (!text) {
        text = " ";
    }
    const isRTL = document.documentElement.getAttribute("dir") === "rtl";
    const textarea = document.createElement("textarea");
    textarea.style.border = "0";
    textarea.style.padding = "0";
    textarea.style.margin = "0";
    textarea.style.position = "absolute";
    textarea.style[isRTL ? "right" : "left"] = "-9999px";
    const yPosition = window.pageYOffset || document.documentElement.scrollTop;
    textarea.style.top = `${yPosition}px`;
    // Prevent zooming on iOS
    textarea.style.fontSize = "12pt";
    textarea.setAttribute("readonly", "");
    textarea.value = text;
    document.body.appendChild(textarea);
    let success = false;
    try {
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        success = document.execCommand("copy");
    }
    catch (error) {
        console.error(error);
    }
    textarea.remove();
    return success;
};
const isClipboardEvent = (event) => {
    /** not using instanceof ClipboardEvent due to tests (jsdom) */
    return (event.type === common_1.EVENT.PASTE ||
        event.type === common_1.EVENT.COPY ||
        event.type === common_1.EVENT.CUT);
};
exports.isClipboardEvent = isClipboardEvent;
