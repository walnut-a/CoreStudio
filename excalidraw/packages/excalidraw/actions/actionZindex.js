"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionBringToFront = exports.actionSendToBack = exports.actionBringForward = exports.actionSendBackward = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const icons_1 = require("../components/icons");
const i18n_1 = require("../i18n");
const shortcut_1 = require("../shortcut");
const register_1 = require("./register");
exports.actionSendBackward = (0, register_1.register)({
    name: "sendBackward",
    label: "labels.sendBackward",
    keywords: ["move down", "zindex", "layer"],
    icon: icons_1.SendBackwardIcon,
    trackEvent: { category: "element" },
    perform: (elements, appState, value, app) => {
        return {
            elements: (0, element_1.moveOneLeft)(elements, appState, app.scene),
            appState,
            captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyPriority: 40,
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] &&
        !event.shiftKey &&
        event.code === common_1.CODES.BRACKET_LEFT,
    PanelComponent: ({ updateData, appState }) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "zIndexButton", onClick: () => updateData(null), title: `${(0, i18n_1.t)("labels.sendBackward")} — ${(0, shortcut_1.getShortcutKey)("CtrlOrCmd+[")}`, children: icons_1.SendBackwardIcon })),
});
exports.actionBringForward = (0, register_1.register)({
    name: "bringForward",
    label: "labels.bringForward",
    keywords: ["move up", "zindex", "layer"],
    icon: icons_1.BringForwardIcon,
    trackEvent: { category: "element" },
    perform: (elements, appState, value, app) => {
        return {
            elements: (0, element_1.moveOneRight)(elements, appState, app.scene),
            appState,
            captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyPriority: 40,
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] &&
        !event.shiftKey &&
        event.code === common_1.CODES.BRACKET_RIGHT,
    PanelComponent: ({ updateData, appState }) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "zIndexButton", onClick: () => updateData(null), title: `${(0, i18n_1.t)("labels.bringForward")} — ${(0, shortcut_1.getShortcutKey)("CtrlOrCmd+]")}`, children: icons_1.BringForwardIcon })),
});
exports.actionSendToBack = (0, register_1.register)({
    name: "sendToBack",
    label: "labels.sendToBack",
    keywords: ["move down", "zindex", "layer"],
    icon: icons_1.SendToBackIcon,
    trackEvent: { category: "element" },
    perform: (elements, appState) => {
        return {
            elements: (0, element_1.moveAllLeft)(elements, appState),
            appState,
            captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => common_1.isDarwin
        ? event[common_1.KEYS.CTRL_OR_CMD] &&
            event.altKey &&
            event.code === common_1.CODES.BRACKET_LEFT
        : event[common_1.KEYS.CTRL_OR_CMD] &&
            event.shiftKey &&
            event.code === common_1.CODES.BRACKET_LEFT,
    PanelComponent: ({ updateData, appState }) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "zIndexButton", onClick: () => updateData(null), title: `${(0, i18n_1.t)("labels.sendToBack")} — ${common_1.isDarwin
            ? (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Alt+[")
            : (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+[")}`, children: icons_1.SendToBackIcon })),
});
exports.actionBringToFront = (0, register_1.register)({
    name: "bringToFront",
    label: "labels.bringToFront",
    keywords: ["move up", "zindex", "layer"],
    icon: icons_1.BringToFrontIcon,
    trackEvent: { category: "element" },
    perform: (elements, appState) => {
        return {
            elements: (0, element_1.moveAllRight)(elements, appState),
            appState,
            captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => common_1.isDarwin
        ? event[common_1.KEYS.CTRL_OR_CMD] &&
            event.altKey &&
            event.code === common_1.CODES.BRACKET_RIGHT
        : event[common_1.KEYS.CTRL_OR_CMD] &&
            event.shiftKey &&
            event.code === common_1.CODES.BRACKET_RIGHT,
    PanelComponent: ({ updateData, appState }) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "zIndexButton", onClick: (event) => updateData(null), title: `${(0, i18n_1.t)("labels.bringToFront")} — ${common_1.isDarwin
            ? (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Alt+]")
            : (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+]")}`, children: icons_1.BringToFrontIcon })),
});
