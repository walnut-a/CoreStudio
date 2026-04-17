"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONExportDialog = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const common_1 = require("@excalidraw/common");
const actionExport_1 = require("../actions/actionExport");
const analytics_1 = require("../analytics");
const filesystem_1 = require("../data/filesystem");
const i18n_1 = require("../i18n");
const Card_1 = require("./Card");
const Dialog_1 = require("./Dialog");
const ToolButton_1 = require("./ToolButton");
const icons_1 = require("./icons");
require("./ExportDialog.scss");
const JSONExportModal = ({ elements, appState, setAppState, files, actionManager, exportOpts, canvas, onCloseRequest, }) => {
    const { onExportToBackend } = exportOpts;
    return ((0, jsx_runtime_1.jsx)("div", { className: "ExportDialog ExportDialog--json", children: (0, jsx_runtime_1.jsxs)("div", { className: "ExportDialog-cards", children: [exportOpts.saveFileToDisk && ((0, jsx_runtime_1.jsxs)(Card_1.Card, { color: "lime", children: [(0, jsx_runtime_1.jsx)("div", { className: "Card-icon", children: icons_1.exportToFileIcon }), (0, jsx_runtime_1.jsx)("h2", { children: (0, i18n_1.t)("exportDialog.disk_title") }), (0, jsx_runtime_1.jsxs)("div", { className: "Card-details", children: [(0, i18n_1.t)("exportDialog.disk_details"), !filesystem_1.nativeFileSystemSupported &&
                                    actionManager.renderAction("changeProjectName")] }), (0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { className: "Card-button", type: "button", title: (0, i18n_1.t)("exportDialog.disk_button"), "aria-label": (0, i18n_1.t)("exportDialog.disk_button"), showAriaLabel: true, onClick: () => {
                                actionManager.executeAction(actionExport_1.actionSaveFileToDisk, "ui");
                            } })] })), onExportToBackend && ((0, jsx_runtime_1.jsxs)(Card_1.Card, { color: "pink", children: [(0, jsx_runtime_1.jsx)("div", { className: "Card-icon", children: icons_1.LinkIcon }), (0, jsx_runtime_1.jsx)("h2", { children: (0, i18n_1.t)("exportDialog.link_title") }), (0, jsx_runtime_1.jsx)("div", { className: "Card-details", children: (0, i18n_1.t)("exportDialog.link_details") }), (0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { className: "Card-button", type: "button", title: (0, i18n_1.t)("exportDialog.link_button"), "aria-label": (0, i18n_1.t)("exportDialog.link_button"), showAriaLabel: true, onClick: async () => {
                                try {
                                    (0, analytics_1.trackEvent)("export", "link", `ui (${(0, common_1.getFrame)()})`);
                                    await onExportToBackend(elements, appState, files);
                                    onCloseRequest();
                                }
                                catch (error) {
                                    setAppState({ errorMessage: error.message });
                                }
                            } })] })), exportOpts.renderCustomUI &&
                    exportOpts.renderCustomUI(elements, appState, files, canvas)] }) }));
};
const JSONExportDialog = ({ elements, appState, files, actionManager, exportOpts, canvas, setAppState, }) => {
    const handleClose = react_1.default.useCallback(() => {
        setAppState({ openDialog: null });
    }, [setAppState]);
    return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: appState.openDialog?.name === "jsonExport" && ((0, jsx_runtime_1.jsx)(Dialog_1.Dialog, { onCloseRequest: handleClose, title: (0, i18n_1.t)("buttons.export"), children: (0, jsx_runtime_1.jsx)(JSONExportModal, { elements: elements, appState: appState, setAppState: setAppState, files: files, actionManager: actionManager, onCloseRequest: handleClose, exportOpts: exportOpts, canvas: canvas }) })) }));
};
exports.JSONExportDialog = JSONExportDialog;
