"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarTabs = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const ui_appState_1 = require("../../context/ui-appState");
const App_1 = require("../App");
const SidebarTabs = ({ children, ...rest }) => {
    const appState = (0, ui_appState_1.useUIAppState)();
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    if (!appState.openSidebar) {
        return null;
    }
    const { name } = appState.openSidebar;
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.Tabs.Root, { className: "sidebar-tabs-root", value: appState.openSidebar.tab, onValueChange: (tab) => setAppState((state) => ({
            ...state,
            openSidebar: { ...state.openSidebar, name, tab },
        })), ...rest, children: children }));
};
exports.SidebarTabs = SidebarTabs;
exports.SidebarTabs.displayName = "SidebarTabs";
