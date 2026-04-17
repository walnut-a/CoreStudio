"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DropDownMenuItemBadge = exports.DropDownMenuItemBadgeType = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const common_1 = require("@excalidraw/common");
const radix_ui_1 = require("radix-ui");
const App_1 = require("../App");
const common_2 = require("./common");
const DropdownMenuItemContent_1 = __importDefault(require("./DropdownMenuItemContent"));
const DropdownMenuItem = ({ icon, badge, value, children, shortcut, className, selected, onSelect, ...rest }) => {
    const handleSelect = (0, common_2.useHandleDropdownMenuItemSelect)(onSelect);
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Item, { className: "radix-menu-item", onSelect: handleSelect, asChild: true, children: (0, jsx_runtime_1.jsx)("button", { ...rest, value: value, className: (0, common_2.getDropdownMenuItemClassName)(className, selected), title: rest.title ?? rest["aria-label"], children: (0, jsx_runtime_1.jsx)(DropdownMenuItemContent_1.default, { icon: icon, shortcut: shortcut, badge: badge, children: children }) }) }));
};
DropdownMenuItem.displayName = "DropdownMenuItem";
exports.DropDownMenuItemBadgeType = {
    GREEN: "green",
    RED: "red",
    BLUE: "blue",
};
const DropDownMenuItemBadge = ({ type = exports.DropDownMenuItemBadgeType.BLUE, children, }) => {
    const { theme } = (0, App_1.useExcalidrawAppState)();
    const style = {
        display: "inline-flex",
        marginLeft: "auto",
        padding: "2px 4px",
        borderRadius: 6,
        fontSize: 9,
        fontFamily: "Cascadia, monospace",
        border: theme === common_1.THEME.LIGHT ? "1.5px solid white" : "none",
    };
    switch (type) {
        case exports.DropDownMenuItemBadgeType.GREEN:
            Object.assign(style, {
                backgroundColor: "var(--background-color-badge)",
                color: "var(--color-badge)",
            });
            break;
        case exports.DropDownMenuItemBadgeType.RED:
            Object.assign(style, {
                backgroundColor: "pink",
                color: "darkred",
            });
            break;
        case exports.DropDownMenuItemBadgeType.BLUE:
        default:
            Object.assign(style, {
                background: "var(--color-promo)",
                color: "var(--color-surface-lowest)",
            });
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "DropDownMenuItemBadge", style: style, children: children }));
};
exports.DropDownMenuItemBadge = DropDownMenuItemBadge;
exports.DropDownMenuItemBadge.displayName = "DropdownMenuItemBadge";
DropdownMenuItem.Badge = exports.DropDownMenuItemBadge;
exports.default = DropdownMenuItem;
