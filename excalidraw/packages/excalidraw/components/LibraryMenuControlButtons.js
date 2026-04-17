"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryMenuControlButtons = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const LibraryMenuBrowseButton_1 = __importDefault(require("./LibraryMenuBrowseButton"));
const LibraryMenuControlButtons = ({ libraryReturnUrl, theme, id, style, children, className, }) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("library-menu-control-buttons", className), style: style, children: [(0, jsx_runtime_1.jsx)(LibraryMenuBrowseButton_1.default, { id: id, libraryReturnUrl: libraryReturnUrl, theme: theme }), children] }));
};
exports.LibraryMenuControlButtons = LibraryMenuControlButtons;
