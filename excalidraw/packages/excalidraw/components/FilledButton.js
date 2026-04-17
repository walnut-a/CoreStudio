"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilledButton = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const errors_1 = require("../errors");
const Spinner_1 = __importDefault(require("./Spinner"));
const icons_1 = require("./icons");
require("./FilledButton.scss");
exports.FilledButton = (0, react_1.forwardRef)(({ children, icon, onClick, label, variant = "filled", color = "primary", size = "medium", fullWidth, className, status, disabled, }, ref) => {
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const _onClick = async (event) => {
        const ret = onClick?.(event);
        if ((0, common_1.isPromiseLike)(ret)) {
            // delay loading state to prevent flicker in case of quick response
            const timer = window.setTimeout(() => {
                setIsLoading(true);
            }, 50);
            try {
                await ret;
            }
            catch (error) {
                if (!(error instanceof errors_1.AbortError)) {
                    throw error;
                }
                else {
                    console.warn(error);
                }
            }
            finally {
                clearTimeout(timer);
                setIsLoading(false);
            }
        }
    };
    const _status = isLoading ? "loading" : status;
    color = _status === "success" ? "success" : color;
    return ((0, jsx_runtime_1.jsx)("button", { className: (0, clsx_1.default)("ExcButton", `ExcButton--color-${color}`, `ExcButton--variant-${variant}`, `ExcButton--size-${size}`, `ExcButton--status-${_status}`, { "ExcButton--fullWidth": fullWidth }, className), onClick: _onClick, type: "button", "aria-label": label, ref: ref, disabled: disabled || _status === "loading" || _status === "success", children: (0, jsx_runtime_1.jsxs)("div", { className: "ExcButton__contents", children: [_status === "loading" ? ((0, jsx_runtime_1.jsx)(Spinner_1.default, { className: "ExcButton__statusIcon" })) : (_status === "success" && ((0, jsx_runtime_1.jsx)("div", { className: "ExcButton__statusIcon", children: icons_1.tablerCheckIcon }))), icon && ((0, jsx_runtime_1.jsx)("div", { className: "ExcButton__icon", "aria-hidden": true, children: icon })), variant !== "icon" && (children ?? label)] }) }));
});
