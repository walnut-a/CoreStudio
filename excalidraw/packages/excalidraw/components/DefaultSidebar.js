"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultSidebar = void 0;
const react_1 = require("react");
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const common_1 = require("@excalidraw/common");
const tunnels_1 = require("../context/tunnels");
const ui_appState_1 = require("../context/ui-appState");
require("../components/dropdownMenu/DropdownMenu.scss");
const App_1 = require("./App");
const LibraryMenu_1 = require("./LibraryMenu");
const SearchMenu_1 = require("./SearchMenu");
const Sidebar_1 = require("./Sidebar/Sidebar");
const withInternalFallback_1 = require("./hoc/withInternalFallback");
const icons_1 = require("./icons");
const DefaultSidebarTrigger = (0, withInternalFallback_1.withInternalFallback)("DefaultSidebarTrigger", (props) => {
    const { DefaultSidebarTriggerTunnel } = (0, tunnels_1.useTunnels)();
    return ((0, jsx_runtime_1.jsx)(DefaultSidebarTriggerTunnel.In, { children: (0, jsx_runtime_1.jsx)(Sidebar_1.Sidebar.Trigger, { ...props, className: "default-sidebar-trigger", name: common_1.DEFAULT_SIDEBAR.name }) }));
});
DefaultSidebarTrigger.displayName = "DefaultSidebarTrigger";
const DefaultTabTriggers = ({ children }) => {
    const { DefaultSidebarTabTriggersTunnel } = (0, tunnels_1.useTunnels)();
    return ((0, jsx_runtime_1.jsx)(DefaultSidebarTabTriggersTunnel.In, { children: children }));
};
DefaultTabTriggers.displayName = "DefaultTabTriggers";
exports.DefaultSidebar = Object.assign((0, withInternalFallback_1.withInternalFallback)("DefaultSidebar", ({ children, className, onDock, docked, ...rest }) => {
    const appState = (0, ui_appState_1.useUIAppState)();
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const { DefaultSidebarTabTriggersTunnel } = (0, tunnels_1.useTunnels)();
    const isForceDocked = appState.openSidebar?.tab === common_1.CANVAS_SEARCH_TAB;
    return ((0, react_1.createElement)(Sidebar_1.Sidebar, { ...rest, name: "default", key: "default", className: (0, clsx_1.default)("default-sidebar", className), docked: isForceDocked || (docked ?? appState.defaultSidebarDockedPreference), onDock: 
        // `onDock=false` disables docking.
        // if `docked` passed, but no onDock passed, disable manual docking.
        isForceDocked || onDock === false || (!onDock && docked != null)
            ? undefined
            : // compose to allow the host app to listen on default behavior
                (0, common_1.composeEventHandlers)(onDock, (docked) => {
                    setAppState({ defaultSidebarDockedPreference: docked });
                }) },
        (0, jsx_runtime_1.jsxs)(Sidebar_1.Sidebar.Tabs, { children: [(0, jsx_runtime_1.jsx)(Sidebar_1.Sidebar.Header, { children: (0, jsx_runtime_1.jsxs)(Sidebar_1.Sidebar.TabTriggers, { children: [(0, jsx_runtime_1.jsx)(Sidebar_1.Sidebar.TabTrigger, { tab: common_1.CANVAS_SEARCH_TAB, children: icons_1.searchIcon }), (0, jsx_runtime_1.jsx)(Sidebar_1.Sidebar.TabTrigger, { tab: common_1.LIBRARY_SIDEBAR_TAB, children: icons_1.LibraryIcon }), (0, jsx_runtime_1.jsx)(DefaultSidebarTabTriggersTunnel.Out, {})] }) }), (0, jsx_runtime_1.jsx)(Sidebar_1.Sidebar.Tab, { tab: common_1.LIBRARY_SIDEBAR_TAB, children: (0, jsx_runtime_1.jsx)(LibraryMenu_1.LibraryMenu, {}) }), (0, jsx_runtime_1.jsx)(Sidebar_1.Sidebar.Tab, { tab: common_1.CANVAS_SEARCH_TAB, children: (0, jsx_runtime_1.jsx)(SearchMenu_1.SearchMenu, {}) }), children] })));
}), {
    Trigger: DefaultSidebarTrigger,
    TabTriggers: DefaultTabTriggers,
});
