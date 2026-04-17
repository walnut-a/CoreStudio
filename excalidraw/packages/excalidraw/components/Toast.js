"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Toast = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const icons_1 = require("./icons");
const ToolButton_1 = require("./ToolButton");
require("./Toast.scss");
const DEFAULT_TOAST_TIMEOUT = 5000;
const ProgressBar = ({ progress }) => ((0, jsx_runtime_1.jsx)("div", { className: "Toast__progress-bar", children: (0, jsx_runtime_1.jsx)("div", { className: "Toast__progress-bar-fill", style: {
            width: `${Math.min(5, Math.round(progress * 100))}%`,
        } }) }));
const ToastComponent = ({ message, onClose, closable = false, 
// To prevent autoclose, pass duration as Infinity
duration = DEFAULT_TOAST_TIMEOUT, style, }) => {
    const timerRef = (0, react_1.useRef)(0);
    const shouldAutoClose = duration !== Infinity;
    const scheduleTimeout = (0, react_1.useCallback)(() => {
        if (!shouldAutoClose) {
            return;
        }
        timerRef.current = window.setTimeout(() => onClose(), duration);
    }, [onClose, duration, shouldAutoClose]);
    (0, react_1.useEffect)(() => {
        if (!shouldAutoClose) {
            return;
        }
        scheduleTimeout();
        return () => clearTimeout(timerRef.current);
    }, [scheduleTimeout, message, duration, shouldAutoClose]);
    const onMouseEnter = shouldAutoClose
        ? () => clearTimeout(timerRef?.current)
        : undefined;
    const onMouseLeave = shouldAutoClose ? scheduleTimeout : undefined;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "Toast", role: "status", onMouseEnter: onMouseEnter, onMouseLeave: onMouseLeave, style: style, children: [(0, jsx_runtime_1.jsx)("div", { className: "Toast__message", children: message }), closable && ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { icon: icons_1.CloseIcon, "aria-label": "close", type: "icon", onClick: onClose, className: "close" }))] }));
};
exports.Toast = Object.assign(ToastComponent, { ProgressBar });
