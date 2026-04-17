"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionToggleStats = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const icons_1 = require("../components/icons");
const register_1 = require("./register");
exports.actionToggleStats = (0, register_1.register)({
    name: "stats",
    label: "stats.fullTitle",
    icon: icons_1.abacusIcon,
    viewMode: true,
    trackEvent: { category: "menu" },
    keywords: ["edit", "attributes", "customize"],
    perform(elements, appState) {
        return {
            appState: {
                ...appState,
                stats: { ...appState.stats, open: !this.checked(appState) },
            },
            captureUpdate: element_1.CaptureUpdateAction.EVENTUALLY,
        };
    },
    checked: (appState) => appState.stats.open,
    keyTest: (event) => !event[common_1.KEYS.CTRL_OR_CMD] && event.altKey && event.code === common_1.CODES.SLASH,
});
