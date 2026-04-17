"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const DropdownMenuItemContent_1 = __importDefault(require("./DropdownMenuItemContent"));
const common_1 = require("./common");
const DropdownMenuItemLink = ({ icon, shortcut, href, children, onSelect, className = "", selected, rel = "noopener", ...rest }) => {
    const handleSelect = (0, common_1.useHandleDropdownMenuItemSelect)(onSelect);
    return (
    // eslint-disable-next-line react/jsx-no-target-blank
    (0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Item, { className: "radix-menu-item", onSelect: handleSelect, asChild: true, children: (0, jsx_runtime_1.jsx)("a", { ...rest, href: href, target: "_blank", rel: `noopener ${rel}`, className: (0, common_1.getDropdownMenuItemClassName)(className, selected), title: rest.title ?? rest["aria-label"], children: (0, jsx_runtime_1.jsx)(DropdownMenuItemContent_1.default, { icon: icon, shortcut: shortcut, children: children }) }) }));
};
exports.default = DropdownMenuItemLink;
DropdownMenuItemLink.displayName = "DropdownMenuItemLink";
