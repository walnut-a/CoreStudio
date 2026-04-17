"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionToggleArrowBinding = void 0;
const element_1 = require("@excalidraw/element");
const register_1 = require("./register");
exports.actionToggleArrowBinding = (0, register_1.register)({
    name: "arrowBinding",
    label: "labels.arrowBinding",
    viewMode: false,
    trackEvent: {
        category: "canvas",
        predicate: (appState) => appState.bindingPreference === "disabled",
    },
    perform(elements, appState) {
        const newPreference = appState.bindingPreference === "enabled" ? "disabled" : "enabled";
        return {
            appState: {
                ...appState,
                bindingPreference: newPreference,
                isBindingEnabled: newPreference === "enabled",
            },
            captureUpdate: element_1.CaptureUpdateAction.NEVER,
        };
    },
    checked: (appState) => appState.bindingPreference === "enabled",
});
