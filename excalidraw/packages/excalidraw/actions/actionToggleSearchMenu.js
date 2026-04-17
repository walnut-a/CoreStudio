"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionToggleSearchMenu = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const icons_1 = require("../components/icons");
const register_1 = require("./register");
exports.actionToggleSearchMenu = (0, register_1.register)({
    name: "searchMenu",
    icon: icons_1.searchIcon,
    keywords: ["search", "find"],
    label: "search.title",
    viewMode: true,
    trackEvent: {
        category: "search_menu",
        action: "toggle",
        predicate: (appState) => appState.gridModeEnabled,
    },
    perform(elements, appState, _, app) {
        if (appState.openDialog) {
            return false;
        }
        if (appState.openSidebar?.name === common_1.DEFAULT_SIDEBAR.name &&
            appState.openSidebar.tab === common_1.CANVAS_SEARCH_TAB) {
            const searchInput = app.excalidrawContainerValue.container?.querySelector(`.${common_1.CLASSES.SEARCH_MENU_INPUT_WRAPPER} input`);
            searchInput?.focus();
            searchInput?.select();
            return false;
        }
        return {
            appState: {
                ...appState,
                openSidebar: { name: common_1.DEFAULT_SIDEBAR.name, tab: common_1.CANVAS_SEARCH_TAB },
                openDialog: null,
            },
            captureUpdate: element_1.CaptureUpdateAction.EVENTUALLY,
        };
    },
    checked: (appState) => appState.gridModeEnabled,
    predicate: (element, appState, props) => {
        return props.gridModeEnabled === undefined;
    },
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] && event.key === common_1.KEYS.F,
});
