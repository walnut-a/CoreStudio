"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const Trans_1 = __importDefault(require("./Trans"));
const BraveMeasureTextError = () => {
    return ((0, jsx_runtime_1.jsxs)("div", { "data-testid": "brave-measure-text-error", children: [(0, jsx_runtime_1.jsx)("p", { children: (0, jsx_runtime_1.jsx)(Trans_1.default, { i18nKey: "errors.brave_measure_text_error.line1", bold: (el) => (0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 600 }, children: el }) }) }), (0, jsx_runtime_1.jsx)("p", { children: (0, jsx_runtime_1.jsx)(Trans_1.default, { i18nKey: "errors.brave_measure_text_error.line2", bold: (el) => (0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 600 }, children: el }) }) }), (0, jsx_runtime_1.jsx)("p", { children: (0, jsx_runtime_1.jsx)(Trans_1.default, { i18nKey: "errors.brave_measure_text_error.line3", link: (el) => ((0, jsx_runtime_1.jsx)("a", { href: "http://docs.excalidraw.com/docs/@excalidraw/excalidraw/faq#turning-off-aggresive-block-fingerprinting-in-brave-browser", children: el })) }) }), (0, jsx_runtime_1.jsx)("p", { children: (0, jsx_runtime_1.jsx)(Trans_1.default, { i18nKey: "errors.brave_measure_text_error.line4", issueLink: (el) => ((0, jsx_runtime_1.jsx)("a", { href: "https://github.com/excalidraw/excalidraw/issues/new", children: el })), discordLink: (el) => (0, jsx_runtime_1.jsxs)("a", { href: "https://discord.gg/UexuTaE", children: [el, "."] }) }) })] }));
};
exports.default = BraveMeasureTextError;
