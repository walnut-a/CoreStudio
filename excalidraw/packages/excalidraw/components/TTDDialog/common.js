"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertToEditor = exports.saveMermaidDataToStorage = exports.convertMermaidToExcalidraw = exports.resetPreview = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const utils_1 = require("@excalidraw/utils");
const EditorLocalStorage_1 = require("../../data/EditorLocalStorage");
const resetPreview = ({ canvasRef, setError, }) => {
    const canvasNode = canvasRef.current;
    if (!canvasNode) {
        return;
    }
    const parent = canvasNode.parentElement;
    if (!parent) {
        return;
    }
    parent.style.background = "";
    setError(null);
    canvasNode.replaceChildren();
};
exports.resetPreview = resetPreview;
const convertMermaidToExcalidraw = async ({ canvasRef, mermaidToExcalidrawLib, mermaidDefinition, setError, data, theme, }) => {
    const canvasNode = canvasRef.current;
    const parent = canvasNode?.parentElement;
    if (!canvasNode || !parent) {
        return { success: false };
    }
    if (!mermaidDefinition) {
        (0, exports.resetPreview)({ canvasRef, setError });
        return { success: false };
    }
    let ret;
    try {
        const api = await mermaidToExcalidrawLib.api;
        try {
            ret = await api.parseMermaidToExcalidraw(mermaidDefinition);
        }
        catch (err) {
            const originalParseError = err;
            if (!mermaidDefinition.includes('"')) {
                return { success: false, error: originalParseError };
            }
            try {
                ret = await api.parseMermaidToExcalidraw(mermaidDefinition.replace(/"/g, "'"));
            }
            catch {
                // Keep the original error so line/column references stay aligned with
                // the user's unmodified input.
                return { success: false, error: originalParseError };
            }
        }
        const { elements, files = {} } = ret;
        setError(null);
        data.current = {
            elements: (0, element_1.convertToExcalidrawElements)(elements, {
                regenerateIds: true,
            }),
            files,
        };
        const canvas = await (0, utils_1.exportToCanvas)({
            elements: data.current.elements,
            files: data.current.files,
            exportPadding: common_1.DEFAULT_EXPORT_PADDING,
            maxWidthOrHeight: Math.max(parent.offsetWidth, parent.offsetHeight) *
                window.devicePixelRatio,
            appState: {
                exportWithDarkMode: theme === common_1.THEME.DARK,
            },
        });
        parent.style.background = "var(--default-bg-color)";
        canvasNode.replaceChildren(canvas);
        return { success: true };
    }
    catch (err) {
        parent.style.background = "var(--default-bg-color)";
        if (mermaidDefinition) {
            setError(err);
        }
        // Return error so caller can display meaningful error message
        return { success: false, error: err };
    }
};
exports.convertMermaidToExcalidraw = convertMermaidToExcalidraw;
const saveMermaidDataToStorage = (mermaidDefinition) => {
    EditorLocalStorage_1.EditorLocalStorage.set(common_1.EDITOR_LS_KEYS.MERMAID_TO_EXCALIDRAW, mermaidDefinition);
};
exports.saveMermaidDataToStorage = saveMermaidDataToStorage;
const insertToEditor = ({ app, data, text, shouldSaveMermaidDataToStorage, }) => {
    const { elements: newElements, files } = data.current;
    if (!newElements.length) {
        return;
    }
    app.addElementsFromPasteOrLibrary({
        elements: newElements,
        files,
        position: "center",
        fitToContent: true,
    });
    app.setOpenDialog(null);
    if (shouldSaveMermaidDataToStorage && text) {
        (0, exports.saveMermaidDataToStorage)(text);
    }
};
exports.insertToEditor = insertToEditor;
