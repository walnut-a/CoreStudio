"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const MenuGroup = ({ children, className = "", style, title, }) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: `dropdown-menu-group ${className}`, style: style, children: [title && (0, jsx_runtime_1.jsx)("p", { className: "dropdown-menu-group-title", children: title }), children] }));
};
exports.default = MenuGroup;
MenuGroup.displayName = "DropdownMenuGroup";
