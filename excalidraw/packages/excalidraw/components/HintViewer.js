"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HintViewer = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const i18n_1 = require("../i18n");
const shortcut_3 = require("../shortcut");
const appState_1 = require("../appState");
const snapping_1 = require("../snapping");
require("./HintViewer.scss");
const getTaggedShortcutKey = (key) => Array.isArray(key)
    ? `<kbd>${key.map(shortcut_3.getShortcutKey).join(" + ")}</kbd>`
    : `<kbd>${(0, shortcut_3.getShortcutKey)(key)}</kbd>`;
const getHints = ({ appState, isMobile, editorInterface, app, }) => {
    const { activeTool, isResizing, isRotating, lastPointerDownWith } = appState;
    const multiMode = appState.multiElement !== null;
    if (appState.openSidebar?.name === common_1.DEFAULT_SIDEBAR.name &&
        appState.openSidebar.tab === common_1.CANVAS_SEARCH_TAB &&
        appState.searchMatches?.matches.length) {
        return (0, i18n_1.t)("hints.dismissSearch", {
            shortcut: getTaggedShortcutKey("Escape"),
        });
    }
    if (appState.openSidebar && !editorInterface.canFitSidebar) {
        return null;
    }
    if ((0, appState_1.isEraserActive)(appState)) {
        return (0, i18n_1.t)("hints.eraserRevert", {
            shortcut: getTaggedShortcutKey("Alt"),
        });
    }
    const selectedElements = app.scene.getSelectedElements(appState);
    // creating or dragging arrow point
    if (appState.selectedLinearElement?.isDragging &&
        selectedElements[0]?.type === "arrow") {
        return (0, i18n_1.t)("hints.arrowBindModifiers", {
            shortcut_1: getTaggedShortcutKey("Ctrl"),
            shortcut_2: getTaggedShortcutKey("Alt"),
        });
    }
    if (activeTool.type === "arrow" || activeTool.type === "line") {
        if (multiMode) {
            return (0, i18n_1.t)("hints.linearElementMulti", {
                shortcut_1: getTaggedShortcutKey("Escape"),
                shortcut_2: getTaggedShortcutKey("Enter"),
            });
        }
        if (activeTool.type === "arrow") {
            return (0, i18n_1.t)("hints.arrowTool", {
                shortcut: getTaggedShortcutKey("A"),
            });
        }
        return (0, i18n_1.t)("hints.linearElement");
    }
    if (activeTool.type === "freedraw") {
        return (0, i18n_1.t)("hints.freeDraw");
    }
    if (activeTool.type === "text") {
        return (0, i18n_1.t)("hints.text");
    }
    if (activeTool.type === "embeddable") {
        return (0, i18n_1.t)("hints.embeddable");
    }
    if (isResizing &&
        lastPointerDownWith === "mouse" &&
        selectedElements.length === 1) {
        const targetElement = selectedElements[0];
        if ((0, element_1.isLinearElement)(targetElement) && targetElement.points.length === 2) {
            return (0, i18n_1.t)("hints.lockAngle", {
                shortcut: getTaggedShortcutKey("Shift"),
            });
        }
        return (0, element_1.isImageElement)(targetElement)
            ? (0, i18n_1.t)("hints.resizeImage", {
                shortcut_1: getTaggedShortcutKey("Shift"),
                shortcut_2: getTaggedShortcutKey("Alt"),
            })
            : (0, i18n_1.t)("hints.resize", {
                shortcut_1: getTaggedShortcutKey("Shift"),
                shortcut_2: getTaggedShortcutKey("Alt"),
            });
    }
    if (isRotating && lastPointerDownWith === "mouse") {
        return (0, i18n_1.t)("hints.rotate", {
            shortcut: getTaggedShortcutKey("Shift"),
        });
    }
    if (selectedElements.length === 1 && (0, element_1.isTextElement)(selectedElements[0])) {
        return (0, i18n_1.t)("hints.text_selected", {
            shortcut: getTaggedShortcutKey("Enter"),
        });
    }
    if (appState.editingTextElement) {
        return (0, i18n_1.t)("hints.text_editing", {
            shortcut_1: getTaggedShortcutKey("Escape"),
            shortcut_2: getTaggedShortcutKey(["CtrlOrCmd", "Enter"]),
        });
    }
    if (appState.croppingElementId) {
        return (0, i18n_1.t)("hints.leaveCropEditor", {
            shortcut_1: getTaggedShortcutKey("Enter"),
            shortcut_2: getTaggedShortcutKey("Escape"),
        });
    }
    if (selectedElements.length === 1 && (0, element_1.isImageElement)(selectedElements[0])) {
        return (0, i18n_1.t)("hints.enterCropEditor", {
            shortcut: getTaggedShortcutKey("Enter"),
        });
    }
    if (activeTool.type === "selection") {
        if (appState.selectionElement &&
            !selectedElements.length &&
            !appState.editingTextElement &&
            !appState.selectedLinearElement?.isEditing) {
            return (0, i18n_1.t)("hints.deepBoxSelect", {
                shortcut: getTaggedShortcutKey("CtrlOrCmd"),
            });
        }
        if ((0, snapping_1.isGridModeEnabled)(app) && appState.selectedElementsAreBeingDragged) {
            return (0, i18n_1.t)("hints.disableSnapping", {
                shortcut: getTaggedShortcutKey("CtrlOrCmd"),
            });
        }
        if (!selectedElements.length && !isMobile) {
            return (0, i18n_1.t)("hints.canvasPanning", {
                shortcut_1: getTaggedShortcutKey((0, i18n_1.t)("keys.mmb")),
                shortcut_2: getTaggedShortcutKey("Space"),
            });
        }
        if (selectedElements.length === 1) {
            if ((0, element_1.isLinearElement)(selectedElements[0])) {
                if (appState.selectedLinearElement?.isEditing) {
                    return appState.selectedLinearElement.selectedPointsIndices
                        ? (0, i18n_1.t)("hints.lineEditor_pointSelected", {
                            shortcut_1: getTaggedShortcutKey("Delete"),
                            shortcut_2: getTaggedShortcutKey(["CtrlOrCmd", "D"]),
                        })
                        : (0, i18n_1.t)("hints.lineEditor_nothingSelected", {
                            shortcut_1: getTaggedShortcutKey("Shift"),
                            shortcut_2: getTaggedShortcutKey("Alt"),
                        });
                }
                return (0, element_1.isLineElement)(selectedElements[0])
                    ? (0, i18n_1.t)("hints.lineEditor_line_info", {
                        shortcut: getTaggedShortcutKey("Enter"),
                    })
                    : (0, i18n_1.t)("hints.lineEditor_info", {
                        shortcut_1: getTaggedShortcutKey("CtrlOrCmd"),
                        shortcut_2: getTaggedShortcutKey(["CtrlOrCmd", "Enter"]),
                    });
            }
            if (!appState.newElement &&
                !appState.selectedElementsAreBeingDragged &&
                (0, element_1.isTextBindableContainer)(selectedElements[0])) {
                const bindTextToElement = (0, i18n_1.t)("hints.bindTextToElement", {
                    shortcut: getTaggedShortcutKey("Enter"),
                });
                const createFlowchart = (0, i18n_1.t)("hints.createFlowchart", {
                    shortcut: getTaggedShortcutKey(["CtrlOrCmd", "↑↓"]),
                });
                if ((0, element_1.isFlowchartNodeElement)(selectedElements[0])) {
                    if ((0, element_2.isNodeInFlowchart)(selectedElements[0], app.scene.getNonDeletedElementsMap())) {
                        return [bindTextToElement, createFlowchart];
                    }
                    return [bindTextToElement, createFlowchart];
                }
                return bindTextToElement;
            }
        }
    }
    return null;
};
const HintViewer = ({ appState, isMobile, editorInterface, app, }) => {
    const hints = getHints({
        appState,
        isMobile,
        editorInterface,
        app,
    });
    if (!hints) {
        return null;
    }
    const hint = Array.isArray(hints)
        ? hints.map((hint) => hint.replace(/\. ?$/, "")).join(", ")
        : hints;
    const hintJSX = hint.split(/(<kbd>[^<]+<\/kbd>)/g).map((part, index) => {
        if (index % 2 === 1) {
            const shortcutMatch = part[0] === "<" && part.match(/^<kbd>([^<]+)<\/kbd>$/);
            return (0, jsx_runtime_1.jsx)("kbd", { children: shortcutMatch ? shortcutMatch[1] : part }, index);
        }
        return part;
    });
    return ((0, jsx_runtime_1.jsx)("div", { className: "HintViewer", children: (0, jsx_runtime_1.jsx)("span", { children: hintJSX }) }));
};
exports.HintViewer = HintViewer;
