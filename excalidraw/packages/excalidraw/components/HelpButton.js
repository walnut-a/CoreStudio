"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpButton = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const i18n_1 = require("../i18n");
const icons_1 = require("./icons");
const HelpButton = (props) => ((0, jsx_runtime_1.jsx)("button", { className: "help-icon", onClick: props.onClick, type: "button", title: `${(0, i18n_1.t)("helpDialog.title")} — ?`, "aria-label": (0, i18n_1.t)("helpDialog.title"), children: icons_1.HelpIcon }));
exports.HelpButton = HelpButton;
