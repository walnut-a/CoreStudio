"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Island = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const clsx_1 = __importDefault(require("clsx"));
require("./Island.scss");
exports.Island = react_1.default.forwardRef(({ children, padding, className, style }, ref) => ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("Island", className), style: { "--padding": padding, ...style }, ref: ref, children: children })));
