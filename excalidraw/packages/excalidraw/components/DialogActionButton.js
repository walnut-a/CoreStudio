"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const Spinner_1 = __importDefault(require("./Spinner"));
require("./DialogActionButton.scss");
const DialogActionButton = ({ label, onClick, className, children, actionType, type = "button", isLoading, ...rest }) => {
    const cs = actionType ? `Dialog__action-button--${actionType}` : "";
    return ((0, jsx_runtime_1.jsxs)("button", { className: (0, clsx_1.default)("Dialog__action-button", cs, className), type: type, "aria-label": label, onClick: onClick, ...rest, children: [children && ((0, jsx_runtime_1.jsx)("div", { style: isLoading ? { visibility: "hidden" } : {}, children: children })), (0, jsx_runtime_1.jsx)("div", { style: isLoading ? { visibility: "hidden" } : {}, children: label }), isLoading && ((0, jsx_runtime_1.jsx)("div", { style: { position: "absolute", inset: 0 }, children: (0, jsx_runtime_1.jsx)(Spinner_1.default, {}) }))] }));
};
exports.default = DialogActionButton;
