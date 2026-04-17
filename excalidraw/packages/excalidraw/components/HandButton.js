"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandButton = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const common_1 = require("@excalidraw/common");
const ToolButton_1 = require("./ToolButton");
const icons_1 = require("./icons");
require("./ToolIcon.scss");
const HandButton = (props) => {
    return ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { className: (0, clsx_1.default)("Shape", { fillable: false, active: props.checked }), type: "radio", icon: icons_1.handIcon, name: "editor-current-shape", checked: props.checked, title: `${props.title} — H`, keyBindingLabel: !props.isMobile ? common_1.KEYS.H.toLocaleUpperCase() : undefined, "aria-label": `${props.title} — H`, "aria-keyshortcuts": common_1.KEYS.H, "data-testid": `toolbar-hand`, onChange: () => props.onChange?.() }));
};
exports.HandButton = HandButton;
