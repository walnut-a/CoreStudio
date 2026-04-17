"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickSearch = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = __importDefault(require("react"));
const icons_1 = require("./icons");
require("./QuickSearch.scss");
exports.QuickSearch = react_1.default.forwardRef(({ className, placeholder, onChange }, ref) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("QuickSearch__wrapper", className), children: [icons_1.searchIcon, (0, jsx_runtime_1.jsx)("input", { ref: ref, className: "QuickSearch__input", type: "text", placeholder: placeholder, onChange: (e) => onChange(e.target.value.trim().toLowerCase()) })] }));
});
