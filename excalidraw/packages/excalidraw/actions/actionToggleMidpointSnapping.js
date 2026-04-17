"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionToggleMidpointSnapping = void 0;
const element_1 = require("@excalidraw/element");
const register_1 = require("./register");
exports.actionToggleMidpointSnapping = (0, register_1.register)({
    name: "midpointSnapping",
    label: "labels.midpointSnapping",
    viewMode: false,
    trackEvent: {
        category: "canvas",
        predicate: (appState) => !appState.isMidpointSnappingEnabled,
    },
    perform(elements, appState) {
        return {
            appState: {
                ...appState,
                isMidpointSnappingEnabled: !this.checked(appState),
            },
            captureUpdate: element_1.CaptureUpdateAction.NEVER,
        };
    },
    checked: (appState) => appState.isMidpointSnappingEnabled,
});
