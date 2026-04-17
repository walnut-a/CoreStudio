"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Avatar = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const clients_1 = require("../clients");
require("./Avatar.scss");
const Avatar = ({ color, onClick, name, src, className, }) => {
    const shortName = (0, clients_1.getNameInitial)(name);
    const [error, setError] = (0, react_1.useState)(false);
    const loadImg = !error && src;
    const style = loadImg ? undefined : { background: color };
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("Avatar", className), style: style, onClick: onClick, children: loadImg ? ((0, jsx_runtime_1.jsx)("img", { className: "Avatar-img", src: src, alt: shortName, referrerPolicy: "no-referrer", onError: () => setError(true) })) : (shortName) }));
};
exports.Avatar = Avatar;
