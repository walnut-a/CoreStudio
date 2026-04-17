"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
require("./Spinner.scss");
const Spinner = ({ size = "1em", circleWidth = 8, synchronized = false, className = "", }) => {
    const mountTime = react_1.default.useRef(Date.now());
    const mountDelay = -(mountTime.current % 1600);
    return ((0, jsx_runtime_1.jsx)("div", { className: `Spinner ${className}`, children: (0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 100 100", style: {
                width: size,
                height: size,
                // fix for remounting causing spinner flicker
                ["--spinner-delay"]: synchronized ? `${mountDelay}ms` : 0,
            }, children: (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: 50 - circleWidth / 2, strokeWidth: circleWidth, fill: "none", strokeMiterlimit: "10" }) }) }));
};
exports.default = Spinner;
