"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixedSideContainer = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
require("./FixedSideContainer.scss");
const FixedSideContainer = ({ children, side, className, }) => ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("FixedSideContainer", `FixedSideContainer_side_${side}`, className), children: children }));
exports.FixedSideContainer = FixedSideContainer;
