"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const icons_1 = require("../icons");
const DropdownMenuItem_1 = __importDefault(require("./DropdownMenuItem"));
const DropdownMenuItemCheckbox = (props) => {
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItem_1.default, { ...props, icon: props.checked ? icons_1.checkIcon : icons_1.emptyIcon }));
};
exports.default = DropdownMenuItemCheckbox;
