"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckboxItem = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const icons_1 = require("./icons");
require("./CheckboxItem.scss");
const CheckboxItem = ({ children, checked, onChange, className }) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("Checkbox", className, { "is-checked": checked }), onClick: (event) => {
            onChange(!checked, event);
            event.currentTarget.querySelector(".Checkbox-box").focus();
        }, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "Checkbox-box", role: "checkbox", "aria-checked": checked, children: icons_1.checkIcon }), (0, jsx_runtime_1.jsx)("div", { className: "Checkbox-label", children: children })] }));
};
exports.CheckboxItem = CheckboxItem;
