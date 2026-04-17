"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const icons_1 = require("../icons");
const common_1 = require("./common");
const DropdownMenuItemContent_1 = __importDefault(require("./DropdownMenuItemContent"));
const DropdownMenuSubTrigger = ({ children, icon, shortcut, className, }) => {
    return ((0, jsx_runtime_1.jsxs)(radix_ui_1.DropdownMenu.SubTrigger, { className: `${(0, common_1.getDropdownMenuItemClassName)(className)} dropdown-menu__submenu-trigger`, children: [(0, jsx_runtime_1.jsx)(DropdownMenuItemContent_1.default, { icon: icon, shortcut: shortcut, children: children }), (0, jsx_runtime_1.jsx)("div", { className: "dropdown-menu__submenu-trigger-icon", children: icons_1.chevronRight })] }));
};
exports.default = DropdownMenuSubTrigger;
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";
