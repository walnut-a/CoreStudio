"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTDPreviewPanel = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const i18n_1 = require("../../i18n");
const icons_1 = require("../icons");
const TTDDialogPanel_1 = require("./TTDDialogPanel");
const TTDDialogOutput_1 = require("./TTDDialogOutput");
const TTDPreviewPanel = ({ canvasRef, error, loaded, onInsert, hideErrorDetails, }) => {
    const actions = [
        {
            action: onInsert,
            label: (0, i18n_1.t)("chat.insert"),
            icon: icons_1.ArrowRightIcon,
            variant: "button",
        },
    ];
    return ((0, jsx_runtime_1.jsx)(TTDDialogPanel_1.TTDDialogPanel, { panelActionJustifyContent: "flex-end", panelActions: actions, className: "ttd-dialog-preview-panel", children: (0, jsx_runtime_1.jsx)(TTDDialogOutput_1.TTDDialogOutput, { canvasRef: canvasRef, error: error, loaded: loaded, hideErrorDetails: hideErrorDetails }) }));
};
exports.TTDPreviewPanel = TTDPreviewPanel;
