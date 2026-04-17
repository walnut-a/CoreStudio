"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const clsx_1 = __importDefault(require("clsx"));
require("./Stack.scss");
const RowStack = (0, react_1.forwardRef)(({ children, gap, align, justifyContent, className, style }, ref) => {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("Stack Stack_horizontal", className), style: {
            "--gap": gap,
            alignItems: align,
            justifyContent,
            ...style,
        }, ref: ref, children: children }));
});
const ColStack = (0, react_1.forwardRef)(({ children, gap, align, justifyContent, className, style }, ref) => {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("Stack Stack_vertical", className), style: {
            "--gap": gap,
            justifyItems: align,
            justifyContent,
            ...style,
        }, ref: ref, children: children }));
});
exports.default = {
    Row: RowStack,
    Col: ColStack,
};
