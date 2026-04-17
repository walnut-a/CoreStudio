"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScrollableList = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
require("./ScrollableList.scss");
const ScrollableList = ({ className, placeholder, children, }) => {
    const isEmpty = !react_1.Children.count(children);
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("ScrollableList__wrapper", className), role: "menu", children: isEmpty ? (0, jsx_runtime_1.jsx)("div", { className: "empty", children: placeholder }) : children }));
};
exports.ScrollableList = ScrollableList;
