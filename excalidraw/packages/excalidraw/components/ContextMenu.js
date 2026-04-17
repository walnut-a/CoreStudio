"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextMenu = exports.CONTEXT_MENU_SEPARATOR = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = __importDefault(require("react"));
const shortcuts_1 = require("../actions/shortcuts");
const i18n_1 = require("../i18n");
const App_1 = require("./App");
const Popover_1 = require("./Popover");
require("./ContextMenu.scss");
exports.CONTEXT_MENU_SEPARATOR = "separator";
exports.ContextMenu = react_1.default.memo(({ actionManager, items, top, left, onClose }) => {
    const appState = (0, App_1.useExcalidrawAppState)();
    const elements = (0, App_1.useExcalidrawElements)();
    const filteredItems = items.reduce((acc, item) => {
        if (item &&
            (item === exports.CONTEXT_MENU_SEPARATOR ||
                !item.predicate ||
                item.predicate(elements, appState, actionManager.app.props, actionManager.app))) {
            acc.push(item);
        }
        return acc;
    }, []);
    return ((0, jsx_runtime_1.jsx)(Popover_1.Popover, { onCloseRequest: () => {
            onClose();
        }, top: top, left: left, fitInViewport: true, offsetLeft: appState.offsetLeft, offsetTop: appState.offsetTop, viewportWidth: appState.width, viewportHeight: appState.height, className: "context-menu-popover", children: (0, jsx_runtime_1.jsx)("ul", { className: "context-menu", onContextMenu: (event) => event.preventDefault(), children: filteredItems.map((item, idx) => {
                if (item === exports.CONTEXT_MENU_SEPARATOR) {
                    if (!filteredItems[idx - 1] ||
                        filteredItems[idx - 1] === exports.CONTEXT_MENU_SEPARATOR) {
                        return null;
                    }
                    return (0, jsx_runtime_1.jsx)("hr", { className: "context-menu-item-separator" }, idx);
                }
                const actionName = item.name;
                let label = "";
                if (item.label) {
                    if (typeof item.label === "function") {
                        label = (0, i18n_1.t)(item.label(elements, appState, actionManager.app));
                    }
                    else {
                        label = (0, i18n_1.t)(item.label);
                    }
                }
                return ((0, jsx_runtime_1.jsx)("li", { "data-testid": actionName, onClick: () => {
                        // we need update state before executing the action in case
                        // the action uses the appState it's being passed (that still
                        // contains a defined contextMenu) to return the next state.
                        onClose(() => {
                            actionManager.executeAction(item, "contextMenu");
                        });
                    }, children: (0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, clsx_1.default)("context-menu-item", {
                            dangerous: actionName === "deleteSelectedElements",
                            checkmark: item.checked?.(appState),
                        }), children: [(0, jsx_runtime_1.jsx)("div", { className: "context-menu-item__label", children: label }), (0, jsx_runtime_1.jsx)("kbd", { className: "context-menu-item__shortcut", children: actionName
                                    ? (0, shortcuts_1.getShortcutFromShortcutName)(actionName)
                                    : "" })] }) }, idx));
            }) }) }));
});
