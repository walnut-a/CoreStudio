"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarTabTriggers = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const SidebarTabTriggers = ({ children, ...rest }) => {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.Tabs.List, { className: "sidebar-triggers", ...rest, children: children }));
};
exports.SidebarTabTriggers = SidebarTabTriggers;
exports.SidebarTabTriggers.displayName = "SidebarTabTriggers";
