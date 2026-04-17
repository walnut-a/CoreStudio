"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RadioGroup = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
require("./RadioGroup.scss");
const RadioGroup = function ({ onChange, value, choices, name, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: "RadioGroup", children: choices.map((choice) => ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("RadioGroup__choice", {
                active: choice.value === value,
            }), title: choice.ariaLabel, children: [(0, jsx_runtime_1.jsx)("input", { name: name, type: "radio", checked: choice.value === value, onChange: () => onChange(choice.value), "aria-label": choice.ariaLabel }), choice.label] }, String(choice.value)))) }));
};
exports.RadioGroup = RadioGroup;
