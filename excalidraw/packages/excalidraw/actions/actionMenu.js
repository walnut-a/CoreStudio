"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionShortcuts = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const icons_1 = require("../components/icons");
const register_1 = require("./register");
exports.actionShortcuts = (0, register_1.register)({
    name: "toggleShortcuts",
    label: "welcomeScreen.defaults.helpHint",
    icon: icons_1.HelpIconThin,
    viewMode: true,
    trackEvent: { category: "menu", action: "toggleHelpDialog" },
    perform: (_elements, appState, _, { focusContainer }) => {
        if (appState.openDialog?.name === "help") {
            focusContainer();
        }
        return {
            appState: {
                ...appState,
                openDialog: appState.openDialog?.name === "help"
                    ? null
                    : {
                        name: "help",
                    },
                openMenu: null,
                openPopup: null,
            },
            captureUpdate: element_1.CaptureUpdateAction.EVENTUALLY,
        };
    },
    keyTest: (event) => event.key === common_1.KEYS.QUESTION_MARK,
});
