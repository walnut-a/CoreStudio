"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTDDialogPanel = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const Button_1 = require("../Button");
const Spinner_1 = __importDefault(require("../Spinner"));
const TTDDialogPanel = ({ label, children, panelActions = [], onTextSubmitInProgess, renderTopRight, renderSubmitShortcut, className, panelActionJustifyContent = "flex-start", }) => {
    const renderPanelAction = (panelAction) => {
        if (panelAction?.variant === "link") {
            return ((0, jsx_runtime_1.jsxs)("button", { className: (0, clsx_1.default)("ttd-dialog-panel-action-link", panelAction.className), onClick: panelAction.action, disabled: panelAction?.disabled || onTextSubmitInProgess, type: "button", children: [panelAction.label, panelAction.icon && ((0, jsx_runtime_1.jsx)("span", { className: "ttd-dialog-panel-action-link__icon", children: panelAction.icon }))] }));
        }
        if (panelAction?.variant === "button") {
            return ((0, jsx_runtime_1.jsxs)(Button_1.Button, { className: (0, clsx_1.default)("ttd-dialog-panel-button", panelAction.className), onSelect: panelAction.action ? panelAction.action : () => { }, disabled: panelAction?.disabled || onTextSubmitInProgess, children: [(0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)({ invisible: onTextSubmitInProgess }), children: [panelAction?.label, panelAction?.icon && (0, jsx_runtime_1.jsx)("span", { children: panelAction.icon })] }), onTextSubmitInProgess && (0, jsx_runtime_1.jsx)(Spinner_1.default, {})] }));
        }
        if (panelAction?.variant === "rateLimit") {
            return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("ttd-dialog-panel__rate-limit", panelAction.className), children: panelAction.label }));
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("ttd-dialog-panel", className), children: [(label || renderTopRight) && ((0, jsx_runtime_1.jsxs)("div", { className: "ttd-dialog-panel__header", children: [typeof label === "string" ? (0, jsx_runtime_1.jsx)("label", { children: label }) : label, renderTopRight?.()] })), children, (0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("ttd-dialog-panel-button-container", {
                    invisible: !panelActions.length,
                }), style: {
                    justifyContent: panelActionJustifyContent,
                }, children: [panelActions.filter(Boolean).map((panelAction) => ((0, jsx_runtime_1.jsx)(react_1.Fragment, { children: renderPanelAction(panelAction) }, panelAction.label))), !onTextSubmitInProgess && renderSubmitShortcut?.()] })] }));
};
exports.TTDDialogPanel = TTDDialogPanel;
