"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverwriteConfirmDialog = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const tunnels_1 = require("../../context/tunnels");
const editor_jotai_1 = require("../../editor-jotai");
const Dialog_1 = require("../Dialog");
const FilledButton_1 = require("../FilledButton");
const withInternalFallback_1 = require("../hoc/withInternalFallback");
const icons_1 = require("../icons");
const OverwriteConfirmActions_1 = require("./OverwriteConfirmActions");
const OverwriteConfirmState_1 = require("./OverwriteConfirmState");
require("./OverwriteConfirm.scss");
const OverwriteConfirmDialog = Object.assign((0, withInternalFallback_1.withInternalFallback)("OverwriteConfirmDialog", ({ children }) => {
    const { OverwriteConfirmDialogTunnel } = (0, tunnels_1.useTunnels)();
    const [overwriteConfirmState, setState] = (0, editor_jotai_1.useAtom)(OverwriteConfirmState_1.overwriteConfirmStateAtom);
    if (!overwriteConfirmState.active) {
        return null;
    }
    const handleClose = () => {
        overwriteConfirmState.onClose();
        setState((state) => ({ ...state, active: false }));
    };
    const handleConfirm = () => {
        overwriteConfirmState.onConfirm();
        setState((state) => ({ ...state, active: false }));
    };
    return ((0, jsx_runtime_1.jsx)(OverwriteConfirmDialogTunnel.In, { children: (0, jsx_runtime_1.jsx)(Dialog_1.Dialog, { onCloseRequest: handleClose, title: false, size: 916, children: (0, jsx_runtime_1.jsxs)("div", { className: "OverwriteConfirm", children: [(0, jsx_runtime_1.jsx)("h3", { children: overwriteConfirmState.title }), (0, jsx_runtime_1.jsxs)("div", { className: `OverwriteConfirm__Description OverwriteConfirm__Description--color-${overwriteConfirmState.color}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "OverwriteConfirm__Description__icon", children: icons_1.alertTriangleIcon }), (0, jsx_runtime_1.jsx)("div", { children: overwriteConfirmState.description }), (0, jsx_runtime_1.jsx)("div", { className: "OverwriteConfirm__Description__spacer" }), (0, jsx_runtime_1.jsx)(FilledButton_1.FilledButton, { color: overwriteConfirmState.color, size: "large", label: overwriteConfirmState.actionLabel, onClick: handleConfirm })] }), (0, jsx_runtime_1.jsx)(OverwriteConfirmActions_1.Actions, { children: children })] }) }) }));
}), {
    Actions: OverwriteConfirmActions_1.Actions,
    Action: OverwriteConfirmActions_1.Action,
});
exports.OverwriteConfirmDialog = OverwriteConfirmDialog;
