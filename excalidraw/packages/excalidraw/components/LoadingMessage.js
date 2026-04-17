"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadingMessage = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const i18n_1 = require("../i18n");
const Spinner_1 = __importDefault(require("./Spinner"));
const LoadingMessage = ({ delay, theme, }) => {
    const [isWaiting, setIsWaiting] = (0, react_1.useState)(!!delay);
    (0, react_1.useEffect)(() => {
        if (!delay) {
            return;
        }
        const timer = setTimeout(() => {
            setIsWaiting(false);
        }, delay);
        return () => clearTimeout(timer);
    }, [delay]);
    if (isWaiting) {
        return null;
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("LoadingMessage", {
            "LoadingMessage--dark": theme === common_1.THEME.DARK,
        }), children: [(0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)(Spinner_1.default, {}) }), (0, jsx_runtime_1.jsx)("div", { className: "LoadingMessage-text", children: (0, i18n_1.t)("labels.loadingScene") })] }));
};
exports.LoadingMessage = LoadingMessage;
