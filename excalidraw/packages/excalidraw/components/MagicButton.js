"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElementCanvasButton = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
require("./ToolIcon.scss");
const DEFAULT_SIZE = "small";
const ElementCanvasButton = (props) => {
    return ((0, jsx_runtime_1.jsxs)("label", { className: (0, clsx_1.default)("ToolIcon ToolIcon__MagicButton", `ToolIcon_size_${DEFAULT_SIZE}`, {
            "is-mobile": props.isMobile,
        }), title: `${props.title}`, children: [(0, jsx_runtime_1.jsx)("input", { className: "ToolIcon_type_checkbox", type: "checkbox", name: props.name, onChange: props.onChange, checked: props.checked, "aria-label": props.title }), (0, jsx_runtime_1.jsx)("div", { className: "ToolIcon__icon", children: props.icon })] }));
};
exports.ElementCanvasButton = ElementCanvasButton;
