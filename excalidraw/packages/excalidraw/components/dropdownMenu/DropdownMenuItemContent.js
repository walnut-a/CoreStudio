"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const App_1 = require("../App");
const Ellipsify_1 = require("../Ellipsify");
const MenuItemContent = ({ textStyle, icon, shortcut, children, badge, }) => {
    const editorInterface = (0, App_1.useEditorInterface)();
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [icon && (0, jsx_runtime_1.jsx)("div", { className: "dropdown-menu-item__icon", children: icon }), (0, jsx_runtime_1.jsx)("div", { style: textStyle, className: "dropdown-menu-item__text", children: (0, jsx_runtime_1.jsx)(Ellipsify_1.Ellipsify, { children: children }) }), badge && (0, jsx_runtime_1.jsx)("div", { className: "dropdown-menu-item__badge", children: badge }), shortcut && editorInterface.formFactor !== "phone" && ((0, jsx_runtime_1.jsx)("div", { className: "dropdown-menu-item__shortcut", children: shortcut }))] }));
};
exports.default = MenuItemContent;
