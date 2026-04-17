"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionToggleViewMode = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const icons_1 = require("../components/icons");
const register_1 = require("./register");
exports.actionToggleViewMode = (0, register_1.register)({
    name: "viewMode",
    label: "labels.viewMode",
    icon: icons_1.eyeIcon,
    viewMode: true,
    trackEvent: {
        category: "canvas",
        predicate: (appState) => !appState.viewModeEnabled,
    },
    perform(elements, appState) {
        return {
            appState: {
                ...appState,
                viewModeEnabled: !this.checked(appState),
            },
            captureUpdate: element_1.CaptureUpdateAction.EVENTUALLY,
        };
    },
    checked: (appState) => appState.viewModeEnabled,
    predicate: (elements, appState, appProps) => {
        return typeof appProps.viewModeEnabled === "undefined";
    },
    keyTest: (event) => !event[common_1.KEYS.CTRL_OR_CMD] && event.altKey && event.code === common_1.CODES.R,
});
