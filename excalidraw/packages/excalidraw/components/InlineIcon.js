"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InlineIcon = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const InlineIcon = ({ className, icon, size = "1em", }) => {
    return ((0, jsx_runtime_1.jsx)("span", { className: className, style: {
            width: size,
            height: "100%",
            margin: "0 0.5ex 0 0.5ex",
            display: "inline-flex",
            lineHeight: 0,
            verticalAlign: "middle",
            flex: "0 0 auto",
        }, children: icon }));
};
exports.InlineIcon = InlineIcon;
