"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Actions = exports.SaveToDisk = exports.ExportToImage = exports.Action = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const actions_1 = require("../../actions");
const actionExport_1 = require("../../actions/actionExport");
const i18n_1 = require("../../i18n");
const App_1 = require("../App");
const FilledButton_1 = require("../FilledButton");
const Action = ({ title, children, actionLabel, onClick, }) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "OverwriteConfirm__Actions__Action", children: [(0, jsx_runtime_1.jsx)("h4", { children: title }), (0, jsx_runtime_1.jsx)("div", { className: "OverwriteConfirm__Actions__Action__content", children: children }), (0, jsx_runtime_1.jsx)(FilledButton_1.FilledButton, { variant: "outlined", color: "muted", label: actionLabel, size: "large", fullWidth: true, onClick: onClick })] }));
};
exports.Action = Action;
const ExportToImage = () => {
    const { t } = (0, i18n_1.useI18n)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    return ((0, jsx_runtime_1.jsx)(exports.Action, { title: t("overwriteConfirm.action.exportToImage.title"), actionLabel: t("overwriteConfirm.action.exportToImage.button"), onClick: () => {
            actionManager.executeAction(actionExport_1.actionChangeExportEmbedScene, "ui", true);
            setAppState({ openDialog: { name: "imageExport" } });
        }, children: t("overwriteConfirm.action.exportToImage.description") }));
};
exports.ExportToImage = ExportToImage;
const SaveToDisk = () => {
    const { t } = (0, i18n_1.useI18n)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    return ((0, jsx_runtime_1.jsx)(exports.Action, { title: t("overwriteConfirm.action.saveToDisk.title"), actionLabel: t("overwriteConfirm.action.saveToDisk.button"), onClick: () => {
            actionManager.executeAction(actions_1.actionSaveFileToDisk, "ui");
        }, children: t("overwriteConfirm.action.saveToDisk.description") }));
};
exports.SaveToDisk = SaveToDisk;
const Actions = Object.assign(({ children }) => {
    return (0, jsx_runtime_1.jsx)("div", { className: "OverwriteConfirm__Actions", children: children });
}, {
    ExportToImage: exports.ExportToImage,
    SaveToDisk: exports.SaveToDisk,
});
exports.Actions = Actions;
