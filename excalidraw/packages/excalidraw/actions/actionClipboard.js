"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyText = exports.actionCopyAsPng = exports.actionCopyAsSvg = exports.actionCut = exports.actionPaste = exports.actionCopy = void 0;
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const element_3 = require("@excalidraw/element");
const clipboard_1 = require("../clipboard");
const icons_1 = require("../components/icons");
const index_1 = require("../data/index");
const i18n_1 = require("../i18n");
const actionDeleteSelected_1 = require("./actionDeleteSelected");
const register_1 = require("./register");
exports.actionCopy = (0, register_1.register)({
    name: "copy",
    label: "labels.copy",
    icon: icons_1.DuplicateIcon,
    trackEvent: { category: "element" },
    perform: async (elements, appState, event, app) => {
        const elementsToCopy = app.scene.getSelectedElements({
            selectedElementIds: appState.selectedElementIds,
            includeBoundTextElement: true,
            includeElementsInFrames: true,
        });
        try {
            await (0, clipboard_1.copyToClipboard)(elementsToCopy, app.files, event);
        }
        catch (error) {
            return {
                captureUpdate: element_3.CaptureUpdateAction.EVENTUALLY,
                appState: {
                    ...appState,
                    errorMessage: error.message,
                },
            };
        }
        return {
            captureUpdate: element_3.CaptureUpdateAction.EVENTUALLY,
        };
    },
    // don't supply a shortcut since we handle this conditionally via onCopy event
    keyTest: undefined,
});
exports.actionPaste = (0, register_1.register)({
    name: "paste",
    label: "labels.paste",
    trackEvent: { category: "element" },
    perform: async (elements, appState, data, app) => {
        let types;
        try {
            types = await (0, clipboard_1.readSystemClipboard)();
        }
        catch (error) {
            if (error.name === "AbortError" || error.name === "NotAllowedError") {
                // user probably aborted the action. Though not 100% sure, it's best
                // to not annoy them with an error message.
                return false;
            }
            console.error(`actionPaste ${error.name}: ${error.message}`);
            if (common_1.isFirefox) {
                return {
                    captureUpdate: element_3.CaptureUpdateAction.EVENTUALLY,
                    appState: {
                        ...appState,
                        errorMessage: (0, i18n_1.t)("hints.firefox_clipboard_write"),
                    },
                };
            }
            return {
                captureUpdate: element_3.CaptureUpdateAction.EVENTUALLY,
                appState: {
                    ...appState,
                    errorMessage: (0, i18n_1.t)("errors.asyncPasteFailedOnRead"),
                },
            };
        }
        try {
            app.pasteFromClipboard((0, clipboard_1.createPasteEvent)({ types }));
        }
        catch (error) {
            console.error(error);
            return {
                captureUpdate: element_3.CaptureUpdateAction.EVENTUALLY,
                appState: {
                    ...appState,
                    errorMessage: (0, i18n_1.t)("errors.asyncPasteFailedOnParse"),
                },
            };
        }
        return {
            captureUpdate: element_3.CaptureUpdateAction.EVENTUALLY,
        };
    },
    // don't supply a shortcut since we handle this conditionally via onCopy event
    keyTest: undefined,
});
exports.actionCut = (0, register_1.register)({
    name: "cut",
    label: "labels.cut",
    icon: icons_1.cutIcon,
    trackEvent: { category: "element" },
    perform: (elements, appState, event, app) => {
        exports.actionCopy.perform(elements, appState, event, app);
        return actionDeleteSelected_1.actionDeleteSelected.perform(elements, appState, null, app);
    },
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] && event.key === common_1.KEYS.X,
});
exports.actionCopyAsSvg = (0, register_1.register)({
    name: "copyAsSvg",
    label: "labels.copyAsSvg",
    icon: icons_1.svgIcon,
    trackEvent: { category: "element" },
    perform: async (elements, appState, _data, app) => {
        if (!app.canvas) {
            return {
                captureUpdate: element_3.CaptureUpdateAction.EVENTUALLY,
            };
        }
        const { exportedElements, exportingFrame } = (0, index_1.prepareElementsForExport)(elements, appState, true);
        try {
            await (0, index_1.exportCanvas)("clipboard-svg", exportedElements, appState, app.files, {
                ...appState,
                exportingFrame,
                name: app.getName(),
            });
            const selectedElements = app.scene.getSelectedElements({
                selectedElementIds: appState.selectedElementIds,
                includeBoundTextElement: true,
                includeElementsInFrames: true,
            });
            return {
                appState: {
                    toast: {
                        message: (0, i18n_1.t)("toast.copyToClipboardAsSvg", {
                            exportSelection: selectedElements.length
                                ? (0, i18n_1.t)("toast.selection")
                                : (0, i18n_1.t)("toast.canvas"),
                            exportColorScheme: appState.exportWithDarkMode
                                ? (0, i18n_1.t)("buttons.darkMode")
                                : (0, i18n_1.t)("buttons.lightMode"),
                        }),
                    },
                },
                captureUpdate: element_3.CaptureUpdateAction.EVENTUALLY,
            };
        }
        catch (error) {
            console.error(error);
            return {
                appState: {
                    errorMessage: error.message,
                },
                captureUpdate: element_3.CaptureUpdateAction.EVENTUALLY,
            };
        }
    },
    predicate: (elements) => {
        return clipboard_1.probablySupportsClipboardWriteText && elements.length > 0;
    },
    keywords: ["svg", "clipboard", "copy"],
});
exports.actionCopyAsPng = (0, register_1.register)({
    name: "copyAsPng",
    label: "labels.copyAsPng",
    icon: icons_1.pngIcon,
    trackEvent: { category: "element" },
    perform: async (elements, appState, _data, app) => {
        if (!app.canvas) {
            return {
                captureUpdate: element_3.CaptureUpdateAction.EVENTUALLY,
            };
        }
        const selectedElements = app.scene.getSelectedElements({
            selectedElementIds: appState.selectedElementIds,
            includeBoundTextElement: true,
            includeElementsInFrames: true,
        });
        const { exportedElements, exportingFrame } = (0, index_1.prepareElementsForExport)(elements, appState, true);
        try {
            await (0, index_1.exportCanvas)("clipboard", exportedElements, appState, app.files, {
                ...appState,
                exportingFrame,
                name: app.getName(),
            });
            return {
                appState: {
                    ...appState,
                    toast: {
                        message: (0, i18n_1.t)("toast.copyToClipboardAsPng", {
                            exportSelection: selectedElements.length
                                ? (0, i18n_1.t)("toast.selection")
                                : (0, i18n_1.t)("toast.canvas"),
                            exportColorScheme: appState.exportWithDarkMode
                                ? (0, i18n_1.t)("buttons.darkMode")
                                : (0, i18n_1.t)("buttons.lightMode"),
                        }),
                    },
                },
                captureUpdate: element_3.CaptureUpdateAction.EVENTUALLY,
            };
        }
        catch (error) {
            console.error(error);
            return {
                appState: {
                    ...appState,
                    errorMessage: error.message,
                },
                captureUpdate: element_3.CaptureUpdateAction.EVENTUALLY,
            };
        }
    },
    predicate: (elements) => {
        return clipboard_1.probablySupportsClipboardBlob && elements.length > 0;
    },
    keyTest: (event) => event.code === common_1.CODES.C && event.altKey && event.shiftKey,
    keywords: ["png", "clipboard", "copy"],
});
exports.copyText = (0, register_1.register)({
    name: "copyText",
    label: "labels.copyText",
    trackEvent: { category: "element" },
    perform: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements({
            selectedElementIds: appState.selectedElementIds,
            includeBoundTextElement: true,
        });
        try {
            (0, clipboard_1.copyTextToSystemClipboard)((0, element_2.getTextFromElements)(selectedElements));
        }
        catch (e) {
            throw new Error((0, i18n_1.t)("errors.copyToSystemClipboardFailed"));
        }
        return {
            captureUpdate: element_3.CaptureUpdateAction.EVENTUALLY,
        };
    },
    predicate: (elements, appState, _, app) => {
        return (clipboard_1.probablySupportsClipboardWriteText &&
            app.scene
                .getSelectedElements({
                selectedElementIds: appState.selectedElementIds,
                includeBoundTextElement: true,
            })
                .some(element_1.isTextElement));
    },
    keywords: ["text", "clipboard", "copy"],
});
