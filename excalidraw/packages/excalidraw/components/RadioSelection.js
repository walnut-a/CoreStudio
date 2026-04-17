"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RadioSelection = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const ButtonIcon_1 = require("./ButtonIcon");
const RadioSelection = (props) => ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: props.options.map((option) => props.type === "button" ? ((0, jsx_runtime_1.jsx)(ButtonIcon_1.ButtonIcon, { icon: option.icon, title: option.text, testId: option.testId, active: option.active ?? props.value === option.value, onClick: (event) => props.onClick(option.value, event) }, option.text)) : ((0, jsx_runtime_1.jsxs)("label", { className: (0, clsx_1.default)({ active: props.value === option.value }), title: option.text, children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: props.group, onChange: () => props.onChange(option.value), checked: props.value === option.value, "data-testid": option.testId }), option.icon] }, option.text))) }));
exports.RadioSelection = RadioSelection;
