"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarTrigger = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const ui_appState_1 = require("../../context/ui-appState");
const App_1 = require("../App");
require("./SidebarTrigger.scss");
const SidebarTrigger = ({ name, tab, icon, title, children, onToggle, className, style, }) => {
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const appState = (0, ui_appState_1.useUIAppState)();
    return ((0, jsx_runtime_1.jsxs)("label", { title: title, className: "sidebar-trigger__label-element", children: [(0, jsx_runtime_1.jsx)("input", { className: "ToolIcon_type_checkbox", type: "checkbox", onChange: (event) => {
                    document
                        .querySelector(".layer-ui__wrapper")
                        ?.classList.remove("animate");
                    const isOpen = event.target.checked;
                    setAppState({
                        openSidebar: isOpen ? { name, tab } : null,
                        openMenu: null,
                        openPopup: null,
                    });
                    onToggle?.(isOpen);
                }, checked: appState.openSidebar?.name === name, "aria-label": title, "aria-keyshortcuts": "0" }), (0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("sidebar-trigger", className), style: style, children: [icon && (0, jsx_runtime_1.jsx)("div", { children: icon }), children && (0, jsx_runtime_1.jsx)("div", { className: "sidebar-trigger__label", children: children })] })] }));
};
exports.SidebarTrigger = SidebarTrigger;
exports.SidebarTrigger.displayName = "SidebarTrigger";
