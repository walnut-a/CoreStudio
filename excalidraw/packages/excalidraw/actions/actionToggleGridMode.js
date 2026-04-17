"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionToggleGridMode = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const icons_1 = require("../components/icons");
const register_1 = require("./register");
exports.actionToggleGridMode = (0, register_1.register)({
    name: "gridMode",
    icon: icons_1.gridIcon,
    keywords: ["snap"],
    label: "labels.toggleGrid",
    viewMode: true,
    trackEvent: {
        category: "canvas",
        predicate: (appState) => appState.gridModeEnabled,
    },
    perform(elements, appState) {
        return {
            appState: {
                ...appState,
                gridModeEnabled: !this.checked(appState),
                objectsSnapModeEnabled: false,
            },
            captureUpdate: element_1.CaptureUpdateAction.EVENTUALLY,
        };
    },
    checked: (appState) => appState.gridModeEnabled,
    predicate: (element, appState, props) => {
        return props.gridModeEnabled === undefined;
    },
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] && event.code === common_1.CODES.QUOTE,
});
