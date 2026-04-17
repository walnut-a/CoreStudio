"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ellipsify = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const Ellipsify = ({ children, ...rest }) => {
    return ((0, jsx_runtime_1.jsx)("span", { ...rest, style: {
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
            ...rest.style,
        }, children: children }));
};
exports.Ellipsify = Ellipsify;
