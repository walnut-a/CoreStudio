"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTDDialogOutput = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const Button_1 = require("../Button");
const Spinner_1 = __importDefault(require("../Spinner"));
const i18n_1 = require("../../i18n");
const icons_1 = require("../icons");
const mermaidError_1 = require("./utils/mermaidError");
const TTDDialogOutput = ({ error, canvasRef, loaded, hideErrorDetails, sourceText, autoFixAvailable, onApplyAutoFix, }) => {
    const errorMessage = error
        ? hideErrorDetails
            ? (0, i18n_1.t)("chat.errors.mermaidParseError")
            : (0, mermaidError_1.formatMermaidParseErrorMessage)(error.message)
        : null;
    const syntaxGuidance = error && !hideErrorDetails
        ? (0, mermaidError_1.getMermaidSyntaxErrorGuidance)(error.message, sourceText)
        : null;
    const showAutoFixButton = !!autoFixAvailable && !!onApplyAutoFix && !hideErrorDetails;
    const errorMessageLines = errorMessage?.split(/\r?\n/) ?? [];
    return ((0, jsx_runtime_1.jsxs)("div", { className: `ttd-dialog-output-wrapper ${error ? "ttd-dialog-output-wrapper--error" : ""}`, children: [error && ((0, jsx_runtime_1.jsx)("div", { "data-testid": "ttd-dialog-output-error", className: "ttd-dialog-output-error", children: (0, jsx_runtime_1.jsxs)("div", { className: "ttd-dialog-output-error-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "ttd-dialog-output-error-icon", children: icons_1.alertTriangleIcon }), syntaxGuidance && ((0, jsx_runtime_1.jsxs)("div", { className: "ttd-dialog-output-error-summary", children: [(0, jsx_runtime_1.jsx)("div", { className: "ttd-dialog-output-error-summary__headline", children: syntaxGuidance.summary }), (0, jsx_runtime_1.jsx)("div", { className: "ttd-dialog-output-error-summary__label", children: "Likely causes:" }), (0, jsx_runtime_1.jsx)("ul", { className: "ttd-dialog-output-error-summary__causes", children: syntaxGuidance.likelyCauses.map((cause) => ((0, jsx_runtime_1.jsx)("li", { children: cause }, cause))) })] })), (0, jsx_runtime_1.jsx)("div", { className: "ttd-dialog-output-error-message", children: errorMessageLines.map((line, index) => ((0, jsx_runtime_1.jsxs)("span", { className: (0, mermaidError_1.isMermaidCaretLine)(line)
                                    ? "ttd-dialog-output-error-message__caret"
                                    : undefined, children: [line, index < errorMessageLines.length - 1 ? "\n" : ""] }, `error-line-${index}`))) }), !hideErrorDetails && ((0, jsx_runtime_1.jsx)("div", { className: "ttd-dialog-output-error-autofix-slot", children: showAutoFixButton ? ((0, jsx_runtime_1.jsx)(Button_1.Button, { className: "ttd-dialog-panel-button ttd-dialog-output-error-autofix", onSelect: onApplyAutoFix, children: (0, i18n_1.t)("mermaid.autoFixAvailable") })) : null }))] }) }, "error")), loaded ? ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("ttd-dialog-output-canvas-container", {
                    invisible: !!error,
                }), children: (0, jsx_runtime_1.jsx)("div", { ref: canvasRef, className: "ttd-dialog-output-canvas-content" }) }, "canvas")) : ((0, jsx_runtime_1.jsx)(Spinner_1.default, { size: "2rem" }))] }));
};
exports.TTDDialogOutput = TTDDialogOutput;
