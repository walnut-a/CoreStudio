"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const common_1 = require("@excalidraw/common");
require("./Button.scss");
/**
 * A generic button component that follows Excalidraw's design system.
 * Style can be customised using `className` or `style` prop.
 * Accepts all props that a regular `button` element accepts.
 */
const Button = ({ type = "button", onSelect, selected, children, className = "", ...rest }) => {
    return ((0, jsx_runtime_1.jsx)("button", { onClick: (0, common_1.composeEventHandlers)(rest.onClick, (event) => {
            onSelect();
        }), type: type, className: (0, clsx_1.default)("excalidraw-button", className, { selected }), ...rest, children: children }));
};
exports.Button = Button;
