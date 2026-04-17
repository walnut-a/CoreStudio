"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolButton = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = __importStar(require("react"));
const common_1 = require("@excalidraw/common");
const errors_1 = require("../errors");
require("./ToolIcon.scss");
const Spinner_1 = __importDefault(require("./Spinner"));
const App_1 = require("./App");
exports.ToolButton = react_1.default.forwardRef(({ size = "medium", visible = true, className = "", ...props }, ref) => {
    const { id: excalId } = (0, App_1.useExcalidrawContainer)();
    const innerRef = react_1.default.useRef(null);
    react_1.default.useImperativeHandle(ref, () => innerRef.current);
    const sizeCn = `ToolIcon_size_${size}`;
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const isMountedRef = (0, react_1.useRef)(true);
    const onClick = async (event) => {
        const ret = "onClick" in props && props.onClick?.(event);
        if ((0, common_1.isPromiseLike)(ret)) {
            try {
                setIsLoading(true);
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
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
            }
        }
    };
    (0, react_1.useEffect)(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    const lastPointerTypeRef = (0, react_1.useRef)(null);
    if (props.type === "button" ||
        props.type === "icon" ||
        props.type === "submit") {
        const type = (props.type === "icon" ? "button" : props.type);
        return ((0, jsx_runtime_1.jsxs)("button", { className: (0, clsx_1.default)("ToolIcon_type_button", sizeCn, className, visible && !props.hidden
                ? "ToolIcon_type_button--show"
                : "ToolIcon_type_button--hide", {
                ToolIcon: !props.hidden,
                "ToolIcon--selected": props.selected,
                "ToolIcon--plain": props.type === "icon",
            }), style: props.style, "data-testid": props["data-testid"], hidden: props.hidden, title: props.title, "aria-label": props["aria-label"], type: type, onClick: onClick, ref: innerRef, disabled: isLoading || props.isLoading || !!props.disabled, children: [(props.icon || props.label) && ((0, jsx_runtime_1.jsxs)("div", { className: "ToolIcon__icon", "aria-hidden": "true", "aria-disabled": !!props.disabled, children: [props.icon || props.label, props.keyBindingLabel && ((0, jsx_runtime_1.jsx)("span", { className: "ToolIcon__keybinding", children: props.keyBindingLabel })), props.isLoading && (0, jsx_runtime_1.jsx)(Spinner_1.default, {})] })), props.showAriaLabel && ((0, jsx_runtime_1.jsxs)("div", { className: "ToolIcon__label", children: [props["aria-label"], " ", isLoading && (0, jsx_runtime_1.jsx)(Spinner_1.default, {})] })), props.children] }));
    }
    return ((0, jsx_runtime_1.jsxs)("label", { className: (0, clsx_1.default)("ToolIcon", className), title: props.title, onPointerDown: (event) => {
            lastPointerTypeRef.current = event.pointerType || null;
            props.onPointerDown?.({ pointerType: event.pointerType || null });
        }, onPointerUp: () => {
            requestAnimationFrame(() => {
                lastPointerTypeRef.current = null;
            });
        }, children: [(0, jsx_runtime_1.jsx)("input", { className: `ToolIcon_type_radio ${sizeCn}`, type: "radio", name: props.name, "aria-label": props["aria-label"], "aria-keyshortcuts": props["aria-keyshortcuts"], "data-testid": props["data-testid"], id: `${excalId}-${props.id}`, onChange: () => {
                    props.onChange?.({ pointerType: lastPointerTypeRef.current });
                }, checked: props.checked, ref: innerRef }), (0, jsx_runtime_1.jsxs)("div", { className: "ToolIcon__icon", children: [props.icon, props.keyBindingLabel && ((0, jsx_runtime_1.jsx)("span", { className: "ToolIcon__keybinding", children: props.keyBindingLabel }))] })] }));
});
exports.ToolButton.displayName = "ToolButton";
