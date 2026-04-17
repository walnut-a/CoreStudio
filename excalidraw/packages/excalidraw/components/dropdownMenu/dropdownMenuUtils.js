"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubMenuContentComponent = exports.getSubMenuTriggerComponent = exports.getMenuContentComponent = exports.getMenuTriggerComponent = void 0;
const react_1 = __importDefault(require("react"));
const getMenuComponent = (component) => (children) => {
    const comp = react_1.default.Children.toArray(children).find((child) => react_1.default.isValidElement(child) &&
        typeof child.type !== "string" &&
        //@ts-ignore
        child?.type.displayName &&
        //@ts-ignore
        child.type.displayName === component);
    if (!comp) {
        return null;
    }
    //@ts-ignore
    return comp;
};
exports.getMenuTriggerComponent = getMenuComponent("DropdownMenuTrigger");
exports.getMenuContentComponent = getMenuComponent("DropdownMenuContent");
exports.getSubMenuTriggerComponent = getMenuComponent("DropdownMenuSubTrigger");
exports.getSubMenuContentComponent = getMenuComponent("DropdownMenuSubContent");
