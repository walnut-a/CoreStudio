"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShortcutFromShortcutName = void 0;
const common_1 = require("@excalidraw/common");
const i18n_1 = require("../i18n");
const shortcut_1 = require("../shortcut");
const shortcutMap = {
    toggleTheme: [(0, shortcut_1.getShortcutKey)("Shift+Alt+D")],
    saveScene: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+S")],
    loadScene: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+O")],
    clearCanvas: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Delete")],
    imageExport: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+E")],
    commandPalette: [
        (0, shortcut_1.getShortcutKey)("CtrlOrCmd+/"),
        (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+P"),
    ],
    cut: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+X")],
    copy: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+C")],
    paste: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+V")],
    copyStyles: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Alt+C")],
    pasteStyles: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Alt+V")],
    selectAll: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+A")],
    deleteSelectedElements: [(0, shortcut_1.getShortcutKey)("Delete")],
    duplicateSelection: [
        (0, shortcut_1.getShortcutKey)("CtrlOrCmd+D"),
        (0, shortcut_1.getShortcutKey)(`Alt+${(0, i18n_1.t)("helpDialog.drag")}`),
    ],
    sendBackward: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+[")],
    bringForward: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+]")],
    sendToBack: [
        common_1.isDarwin
            ? (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Alt+[")
            : (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+["),
    ],
    bringToFront: [
        common_1.isDarwin
            ? (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Alt+]")
            : (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+]"),
    ],
    copyAsPng: [(0, shortcut_1.getShortcutKey)("Shift+Alt+C")],
    group: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+G")],
    ungroup: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+G")],
    gridMode: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+'")],
    zenMode: [(0, shortcut_1.getShortcutKey)("Alt+Z")],
    objectsSnapMode: [(0, shortcut_1.getShortcutKey)("Alt+S")],
    stats: [(0, shortcut_1.getShortcutKey)("Alt+/")],
    addToLibrary: [],
    flipHorizontal: [(0, shortcut_1.getShortcutKey)("Shift+H")],
    flipVertical: [(0, shortcut_1.getShortcutKey)("Shift+V")],
    viewMode: [(0, shortcut_1.getShortcutKey)("Alt+R")],
    hyperlink: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+K")],
    toggleElementLock: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+L")],
    resetZoom: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+0")],
    zoomOut: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+-")],
    zoomIn: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd++")],
    zoomToFitSelection: [(0, shortcut_1.getShortcutKey)("Shift+3")],
    zoomToFit: [(0, shortcut_1.getShortcutKey)("Shift+1")],
    zoomToFitSelectionInViewport: [(0, shortcut_1.getShortcutKey)("Shift+2")],
    toggleEraserTool: [(0, shortcut_1.getShortcutKey)("E")],
    toggleHandTool: [(0, shortcut_1.getShortcutKey)("H")],
    setFrameAsActiveTool: [(0, shortcut_1.getShortcutKey)("F")],
    saveFileToDisk: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+S")],
    saveToActiveFile: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+S")],
    toggleShortcuts: [(0, shortcut_1.getShortcutKey)("?")],
    searchMenu: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+F")],
    wrapSelectionInFrame: [],
    toolLock: [(0, shortcut_1.getShortcutKey)("Q")],
};
const getShortcutFromShortcutName = (name, idx = 0) => {
    const shortcuts = shortcutMap[name];
    // if multiple shortcuts available, take the first one
    return shortcuts && shortcuts.length > 0
        ? shortcuts[idx] || shortcuts[0]
        : "";
};
exports.getShortcutFromShortcutName = getShortcutFromShortcutName;
