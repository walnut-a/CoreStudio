"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
require("./Card.scss");
// for open-color see https://github.com/yeun/open-color/blob/master/open-color.scss
const COLOR_MAP = {
    primary: {
        base: "var(--color-primary)",
        darker: "var(--color-primary-darker)",
        darkest: "var(--color-primary-darkest)",
    },
    lime: {
        base: "#74b816", // open-color lime[7]
        darker: "#66a80f", // open-color lime[8]
        darkest: "#5c940d", // open-color lime[9]
    },
    pink: {
        base: "#d6336c", // open-color pink[7]
        darker: "#c2255c", // open-color pink[8]
        darkest: "#a61e4d", // open-color pink[9]
    },
};
const Card = ({ children, color }) => {
    return ((0, jsx_runtime_1.jsx)("div", { className: "Card", style: {
            ["--card-color"]: COLOR_MAP[color].base,
            ["--card-color-darker"]: COLOR_MAP[color].darker,
            ["--card-color-darkest"]: COLOR_MAP[color].darkest,
        }, children: children }));
};
exports.Card = Card;
