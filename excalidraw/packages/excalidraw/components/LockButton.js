"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockButton = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
require("./ToolIcon.scss");
const icons_1 = require("./icons");
const DEFAULT_SIZE = "medium";
const ICONS = {
    CHECKED: icons_1.LockedIcon,
    UNCHECKED: icons_1.UnlockedIcon,
};
const LockButton = (props) => {
    return ((0, jsx_runtime_1.jsxs)("label", { className: (0, clsx_1.default)("ToolIcon ToolIcon__lock", `ToolIcon_size_${DEFAULT_SIZE}`, {
            "is-mobile": props.isMobile,
        }), title: `${props.title} — Q`, children: [(0, jsx_runtime_1.jsx)("input", { className: "ToolIcon_type_checkbox", type: "checkbox", name: props.name, onChange: props.onChange, checked: props.checked, "aria-label": props.title, "data-testid": "toolbar-lock" }), (0, jsx_runtime_1.jsx)("div", { className: "ToolIcon__icon", children: props.checked ? ICONS.CHECKED : ICONS.UNCHECKED })] }));
};
exports.LockButton = LockButton;
