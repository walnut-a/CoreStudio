"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionToggleShapeSwitch = void 0;
const element_1 = require("@excalidraw/element");
const ConvertElementTypePopup_1 = require("../components/ConvertElementTypePopup");
const editor_jotai_1 = require("../editor-jotai");
const register_1 = require("./register");
exports.actionToggleShapeSwitch = (0, register_1.register)({
    name: "toggleShapeSwitch",
    label: "labels.shapeSwitch",
    icon: () => null,
    viewMode: true,
    trackEvent: {
        category: "shape_switch",
        action: "toggle",
    },
    keywords: ["change", "switch", "swap"],
    perform(elements, appState, _, app) {
        editor_jotai_1.editorJotaiStore.set(ConvertElementTypePopup_1.convertElementTypePopupAtom, {
            type: "panel",
        });
        return {
            captureUpdate: element_1.CaptureUpdateAction.NEVER,
        };
    },
    checked: (appState) => appState.gridModeEnabled,
    predicate: (elements, appState, props) => (0, ConvertElementTypePopup_1.getConversionTypeFromElements)(elements) !== null,
});
