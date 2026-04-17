"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionToggleZenMode = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const icons_1 = require("../components/icons");
const register_1 = require("./register");
exports.actionToggleZenMode = (0, register_1.register)({
    name: "zenMode",
    label: "buttons.zenMode",
    icon: icons_1.coffeeIcon,
    viewMode: true,
    trackEvent: {
        category: "canvas",
        predicate: (appState) => !appState.zenModeEnabled,
    },
    perform(elements, appState) {
        return {
            appState: {
                ...appState,
                zenModeEnabled: !this.checked(appState),
            },
            captureUpdate: element_1.CaptureUpdateAction.EVENTUALLY,
        };
    },
    checked: (appState) => appState.zenModeEnabled,
    predicate: (elements, appState, appProps, app) => {
        return (app.editorInterface.formFactor !== "phone" &&
            typeof appProps.zenModeEnabled === "undefined");
    },
    keyTest: (event) => !event[common_1.KEYS.CTRL_OR_CMD] && event.altKey && event.code === common_1.CODES.Z,
});
