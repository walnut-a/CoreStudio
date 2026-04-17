"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_dom_1 = require("react-dom");
const editor_jotai_1 = require("../editor-jotai");
const i18n_1 = require("../i18n");
const Dialog_1 = require("./Dialog");
const DialogActionButton_1 = __importDefault(require("./DialogActionButton"));
const LibraryMenu_1 = require("./LibraryMenu");
const App_1 = require("./App");
require("./ConfirmDialog.scss");
const ConfirmDialog = (props) => {
    const { onConfirm, onCancel, children, confirmText = (0, i18n_1.t)("buttons.confirm"), cancelText = (0, i18n_1.t)("buttons.cancel"), className = "", ...rest } = props;
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const setIsLibraryMenuOpen = (0, editor_jotai_1.useSetAtom)(LibraryMenu_1.isLibraryMenuOpenAtom);
    const { container } = (0, App_1.useExcalidrawContainer)();
    return ((0, jsx_runtime_1.jsxs)(Dialog_1.Dialog, { onCloseRequest: onCancel, size: "small", ...rest, className: `confirm-dialog ${className}`, children: [children, (0, jsx_runtime_1.jsxs)("div", { className: "confirm-dialog-buttons", children: [(0, jsx_runtime_1.jsx)(DialogActionButton_1.default, { label: cancelText, onClick: () => {
                            setAppState({ openMenu: null });
                            setIsLibraryMenuOpen(false);
                            // flush any pending updates synchronously,
                            // otherwise it could lead to crash in some chromium versions (131.0.6778.86),
                            // when `.focus` is invoked with container in some intermediate state
                            // (container seems mounted in DOM, but focus still causes a crash)
                            (0, react_dom_1.flushSync)(() => {
                                onCancel();
                            });
                            container?.focus();
                        } }), (0, jsx_runtime_1.jsx)(DialogActionButton_1.default, { label: confirmText, onClick: () => {
                            setAppState({ openMenu: null });
                            setIsLibraryMenuOpen(false);
                            // flush any pending updates synchronously,
                            // otherwise it leads to crash in some chromium versions (131.0.6778.86),
                            // when `.focus` is invoked with container in some intermediate state
                            // (container seems mounted in DOM, but focus still causes a crash)
                            (0, react_dom_1.flushSync)(() => {
                                onConfirm();
                            });
                            container?.focus();
                        }, actionType: "danger" })] })] }));
};
exports.default = ConfirmDialog;
