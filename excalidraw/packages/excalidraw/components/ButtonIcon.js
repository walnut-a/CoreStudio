"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonIcon = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
require("./ButtonIcon.scss");
exports.ButtonIcon = (0, react_1.forwardRef)((props, ref) => {
    const { title, className, testId, active, standalone, icon, onClick } = props;
    return ((0, jsx_runtime_1.jsx)("button", { type: "button", ref: ref, title: title, "data-testid": testId, className: (0, clsx_1.default)(className, { standalone, active }), onClick: onClick, style: props.style, children: icon }, title));
});
