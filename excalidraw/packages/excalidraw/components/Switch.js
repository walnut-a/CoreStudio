"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Switch = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
require("./Switch.scss");
const Switch = ({ title, name, checked, onChange, disabled = false, }) => {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("Switch", { toggled: checked, disabled }), children: (0, jsx_runtime_1.jsx)("input", { name: name, id: name, title: title, type: "checkbox", checked: checked, disabled: disabled, onChange: () => onChange(!checked), onKeyDown: (event) => {
                if (event.key === " ") {
                    onChange(!checked);
                }
            } }) }));
};
exports.Switch = Switch;
