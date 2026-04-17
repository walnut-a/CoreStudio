"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActiveConfirmDialog = exports.activeConfirmDialogAtom = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const actions_1 = require("../actions");
const editor_jotai_1 = require("../editor-jotai");
const i18n_1 = require("../i18n");
const App_1 = require("./App");
const ConfirmDialog_1 = __importDefault(require("./ConfirmDialog"));
exports.activeConfirmDialogAtom = (0, editor_jotai_1.atom)(null);
const ActiveConfirmDialog = () => {
    const [activeConfirmDialog, setActiveConfirmDialog] = (0, editor_jotai_1.useAtom)(exports.activeConfirmDialogAtom);
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    if (!activeConfirmDialog) {
        return null;
    }
    if (activeConfirmDialog === "clearCanvas") {
        return ((0, jsx_runtime_1.jsx)(ConfirmDialog_1.default, { onConfirm: () => {
                actionManager.executeAction(actions_1.actionClearCanvas);
                setActiveConfirmDialog(null);
            }, onCancel: () => setActiveConfirmDialog(null), title: (0, i18n_1.t)("clearCanvasDialog.title"), children: (0, jsx_runtime_1.jsxs)("p", { className: "clear-canvas__content", children: [" ", (0, i18n_1.t)("alerts.clearReset")] }) }));
    }
    return null;
};
exports.ActiveConfirmDialog = ActiveConfirmDialog;
