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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Range = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
require("./Range.scss");
const Range = ({ label, value, onChange, min = 0, max = 100, step = 10, minLabel = min, hasCommonValue = true, testId, }) => {
    const rangeRef = react_1.default.useRef(null);
    const valueRef = react_1.default.useRef(null);
    (0, react_1.useEffect)(() => {
        if (rangeRef.current && valueRef.current) {
            const rangeElement = rangeRef.current;
            const valueElement = valueRef.current;
            const inputWidth = rangeElement.offsetWidth;
            const thumbWidth = parseFloat(getComputedStyle(rangeElement).getPropertyValue("--slider-thumb-size")) || 16;
            const progress = ((value - min) / (max - min || 1)) * 100;
            const position = (progress / 100) * (inputWidth - thumbWidth) + thumbWidth / 2;
            valueElement.style.left = `${position}px`;
            rangeElement.style.background = `linear-gradient(to right, var(--color-slider-track) 0%, var(--color-slider-track) ${progress}%, var(--button-bg) ${progress}%, var(--button-bg) 100%)`;
        }
    }, [max, min, value]);
    return ((0, jsx_runtime_1.jsxs)("label", { className: "control-label", children: [label, (0, jsx_runtime_1.jsxs)("div", { className: "range-wrapper", children: [(0, jsx_runtime_1.jsx)("input", { style: {
                            ["--color-slider-track"]: hasCommonValue
                                ? undefined
                                : "var(--button-bg)",
                        }, ref: rangeRef, type: "range", min: min, max: max, step: step, onChange: (event) => {
                            onChange(+event.target.value);
                        }, value: value, className: "range-input", "data-testid": testId }), (0, jsx_runtime_1.jsx)("div", { className: "value-bubble", ref: valueRef, children: value !== min ? value : null }), (0, jsx_runtime_1.jsx)("div", { className: "zero-label", children: minLabel })] })] }));
};
exports.Range = Range;
