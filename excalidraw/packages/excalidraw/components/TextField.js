"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextField = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const Button_1 = require("./Button");
const icons_1 = require("./icons");
require("./TextField.scss");
exports.TextField = (0, react_1.forwardRef)(({ onChange, label, fullWidth, placeholder, readonly, selectOnRender, onKeyDown, isRedacted = false, icon, className, type, ...rest }, ref) => {
    const innerRef = (0, react_1.useRef)(null);
    (0, react_1.useImperativeHandle)(ref, () => innerRef.current);
    (0, react_1.useLayoutEffect)(() => {
        if (selectOnRender) {
            // focusing first is needed because vitest/jsdom
            innerRef.current?.focus();
            innerRef.current?.select();
        }
    }, [selectOnRender]);
    const [isTemporarilyUnredacted, setIsTemporarilyUnredacted] = (0, react_1.useState)(false);
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("ExcTextField", className, {
            "ExcTextField--fullWidth": fullWidth,
            "ExcTextField--hasIcon": !!icon,
        }), onClick: () => {
            innerRef.current?.focus();
        }, children: [icon, label && (0, jsx_runtime_1.jsx)("div", { className: "ExcTextField__label", children: label }), (0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("ExcTextField__input", {
                    "ExcTextField__input--readonly": readonly,
                }), children: [(0, jsx_runtime_1.jsx)("input", { className: (0, clsx_1.default)({
                            "is-redacted": "value" in rest &&
                                rest.value &&
                                isRedacted &&
                                !isTemporarilyUnredacted,
                        }), readOnly: readonly, value: "value" in rest ? rest.value : undefined, defaultValue: "defaultValue" in rest ? rest.defaultValue : undefined, placeholder: placeholder, ref: innerRef, onChange: (event) => onChange?.(event.target.value), onKeyDown: onKeyDown, type: type }), isRedacted && ((0, jsx_runtime_1.jsx)(Button_1.Button, { onSelect: () => setIsTemporarilyUnredacted(!isTemporarilyUnredacted), style: { border: 0, userSelect: "none" }, children: isTemporarilyUnredacted ? icons_1.eyeClosedIcon : icons_1.eyeIcon }))] })] }));
});
