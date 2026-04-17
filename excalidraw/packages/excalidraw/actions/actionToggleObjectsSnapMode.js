"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionToggleObjectsSnapMode = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const icons_1 = require("../components/icons");
const register_1 = require("./register");
exports.actionToggleObjectsSnapMode = (0, register_1.register)({
    name: "objectsSnapMode",
    label: "buttons.objectsSnapMode",
    icon: icons_1.magnetIcon,
    viewMode: false,
    trackEvent: {
        category: "canvas",
        predicate: (appState) => !appState.objectsSnapModeEnabled,
    },
    perform(elements, appState) {
        return {
            appState: {
                ...appState,
                objectsSnapModeEnabled: !this.checked(appState),
                gridModeEnabled: false,
            },
            captureUpdate: element_1.CaptureUpdateAction.EVENTUALLY,
        };
    },
    checked: (appState) => appState.objectsSnapModeEnabled,
    predicate: (elements, appState, appProps) => {
        return typeof appProps.objectsSnapModeEnabled === "undefined";
    },
    keyTest: (event) => !event[common_1.KEYS.CTRL_OR_CMD] && event.altKey && event.code === common_1.CODES.S,
});
