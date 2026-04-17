"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const DropdownMenuItemCustom = ({ children, className = "", selected, ...rest }) => {
    return ((0, jsx_runtime_1.jsx)("div", { ...rest, className: `dropdown-menu-item-base dropdown-menu-item-custom ${className} ${selected ? `dropdown-menu-item--selected` : ``}`.trim(), children: children }));
};
exports.default = DropdownMenuItemCustom;
