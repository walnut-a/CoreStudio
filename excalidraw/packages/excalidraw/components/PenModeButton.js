"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PenModeButton = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
require("./ToolIcon.scss");
const icons_1 = require("./icons");
const DEFAULT_SIZE = "medium";
const PenModeButton = (props) => {
    if (!props.penDetected) {
        return null;
    }
    return ((0, jsx_runtime_1.jsxs)("label", { className: (0, clsx_1.default)("ToolIcon ToolIcon__penMode", `ToolIcon_size_${DEFAULT_SIZE}`, {
            "is-mobile": props.isMobile,
        }), title: `${props.title}`, children: [(0, jsx_runtime_1.jsx)("input", { className: "ToolIcon_type_checkbox", type: "checkbox", name: props.name, onChange: props.onChange, checked: props.checked, "aria-label": props.title }), (0, jsx_runtime_1.jsx)("div", { className: "ToolIcon__icon", children: icons_1.PenModeIcon })] }));
};
exports.PenModeButton = PenModeButton;
