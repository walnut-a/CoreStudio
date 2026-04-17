"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageExportDialog = exports.ErrorCanvasPreview = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const export_1 = require("@excalidraw/utils/export");
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const actionExport_1 = require("../actions/actionExport");
const clipboard_1 = require("../clipboard");
const data_1 = require("../data");
const blob_1 = require("../data/blob");
const filesystem_1 = require("../data/filesystem");
const useCopiedIndicator_1 = require("../hooks/useCopiedIndicator");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const icons_1 = require("./icons");
const Dialog_1 = require("./Dialog");
const RadioGroup_1 = require("./RadioGroup");
const Switch_1 = require("./Switch");
const Tooltip_1 = require("./Tooltip");
const FilledButton_1 = require("./FilledButton");
require("./ImageExportDialog.scss");
const ErrorCanvasPreview = () => {
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: (0, i18n_1.t)("canvasError.cannotShowPreview") }), (0, jsx_runtime_1.jsx)("p", { children: (0, jsx_runtime_1.jsx)("span", { children: (0, i18n_1.t)("canvasError.canvasTooBig") }) }), (0, jsx_runtime_1.jsxs)("em", { children: ["(", (0, i18n_1.t)("canvasError.canvasTooBigTip"), ")"] })] }));
};
exports.ErrorCanvasPreview = ErrorCanvasPreview;
const ImageExportModal = ({ appStateSnapshot, elementsSnapshot, files, actionManager, onExportImage, name, exportWithDarkMode, }) => {
    const hasSelection = (0, scene_1.isSomeElementSelected)(elementsSnapshot, appStateSnapshot);
    const [projectName, setProjectName] = (0, react_1.useState)(name);
    const [exportSelectionOnly, setExportSelectionOnly] = (0, react_1.useState)(hasSelection);
    const [exportWithBackground, setExportWithBackground] = (0, react_1.useState)(appStateSnapshot.exportBackground);
    const [embedScene, setEmbedScene] = (0, react_1.useState)(appStateSnapshot.exportEmbedScene);
    const [exportScale, setExportScale] = (0, react_1.useState)(appStateSnapshot.exportScale);
    const previewRef = (0, react_1.useRef)(null);
    const previewRenderRequestIdRef = (0, react_1.useRef)(0);
    const [renderError, setRenderError] = (0, react_1.useState)(null);
    const { onCopy, copyStatus, resetCopyStatus } = (0, useCopiedIndicator_1.useCopyStatus)();
    (0, react_1.useEffect)(() => {
        // if user changes setting right after export to clipboard, reset the status
        // so they don't have to wait for the timeout to click the button again
        resetCopyStatus();
    }, [
        projectName,
        exportWithBackground,
        exportWithDarkMode,
        exportScale,
        embedScene,
        resetCopyStatus,
    ]);
    const { exportedElements, exportingFrame } = (0, data_1.prepareElementsForExport)(elementsSnapshot, appStateSnapshot, exportSelectionOnly);
    (0, react_1.useEffect)(() => {
        const previewNode = previewRef.current;
        if (!previewNode) {
            return;
        }
        const maxWidth = previewNode.offsetWidth;
        const maxHeight = previewNode.offsetHeight;
        if (!maxWidth) {
            return;
        }
        const requestId = ++previewRenderRequestIdRef.current;
        const isStaleRequest = () => {
            return requestId !== previewRenderRequestIdRef.current;
        };
        (0, export_1.exportToCanvas)({
            elements: exportedElements,
            appState: {
                ...appStateSnapshot,
                name: projectName,
                exportBackground: exportWithBackground,
                exportWithDarkMode,
                exportScale,
                exportEmbedScene: embedScene,
            },
            files,
            exportPadding: common_1.DEFAULT_EXPORT_PADDING,
            maxWidthOrHeight: Math.max(maxWidth, maxHeight),
            exportingFrame,
        })
            .then(async (canvas) => {
            if (isStaleRequest()) {
                return;
            }
            // If converting to blob fails, there's some problem that will likely
            // prevent preview and export (e.g. canvas too big).
            try {
                await (0, blob_1.canvasToBlob)(canvas);
            }
            catch (error) {
                if (error.name === "CANVAS_POSSIBLY_TOO_BIG") {
                    throw new Error((0, i18n_1.t)("canvasError.canvasTooBig"));
                }
                throw error;
            }
            if (isStaleRequest()) {
                return;
            }
            setRenderError(null);
            previewNode.replaceChildren(canvas);
        })
            .catch((error) => {
            if (isStaleRequest()) {
                return;
            }
            console.error(error);
            setRenderError(error);
        });
        return () => {
            previewRenderRequestIdRef.current += 1;
        };
    }, [
        appStateSnapshot,
        files,
        exportedElements,
        exportingFrame,
        projectName,
        exportWithBackground,
        exportWithDarkMode,
        exportScale,
        embedScene,
    ]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "ImageExportModal", children: [(0, jsx_runtime_1.jsx)("h3", { children: (0, i18n_1.t)("imageExportDialog.header") }), (0, jsx_runtime_1.jsxs)("div", { className: "ImageExportModal__preview", children: [(0, jsx_runtime_1.jsx)("div", { className: "ImageExportModal__preview__canvas", ref: previewRef, children: renderError && (0, jsx_runtime_1.jsx)(exports.ErrorCanvasPreview, {}) }), (0, jsx_runtime_1.jsx)("div", { className: "ImageExportModal__preview__filename", children: !filesystem_1.nativeFileSystemSupported && ((0, jsx_runtime_1.jsx)("input", { type: "text", className: "TextInput", value: projectName, style: { width: "30ch" }, onChange: (event) => {
                                setProjectName(event.target.value);
                                actionManager.executeAction(actionExport_1.actionChangeProjectName, "ui", event.target.value);
                            } })) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "ImageExportModal__settings", children: [(0, jsx_runtime_1.jsx)("h3", { children: (0, i18n_1.t)("imageExportDialog.header") }), hasSelection && ((0, jsx_runtime_1.jsx)(ExportSetting, { label: (0, i18n_1.t)("imageExportDialog.label.onlySelected"), name: "exportOnlySelected", children: (0, jsx_runtime_1.jsx)(Switch_1.Switch, { name: "exportOnlySelected", checked: exportSelectionOnly, onChange: (checked) => {
                                setExportSelectionOnly(checked);
                            } }) })), (0, jsx_runtime_1.jsx)(ExportSetting, { label: (0, i18n_1.t)("imageExportDialog.label.withBackground"), name: "exportBackgroundSwitch", children: (0, jsx_runtime_1.jsx)(Switch_1.Switch, { name: "exportBackgroundSwitch", checked: exportWithBackground, onChange: (checked) => {
                                setExportWithBackground(checked);
                                actionManager.executeAction(actionExport_1.actionChangeExportBackground, "ui", checked);
                            } }) }), (0, jsx_runtime_1.jsx)(ExportSetting, { label: (0, i18n_1.t)("imageExportDialog.label.darkMode"), name: "exportDarkModeSwitch", children: (0, jsx_runtime_1.jsx)(Switch_1.Switch, { name: "exportDarkModeSwitch", checked: exportWithDarkMode, onChange: (checked) => {
                                actionManager.executeAction(actionExport_1.actionExportWithDarkMode, "ui", checked);
                            } }) }), (0, jsx_runtime_1.jsx)(ExportSetting, { label: (0, i18n_1.t)("imageExportDialog.label.embedScene"), tooltip: (0, i18n_1.t)("imageExportDialog.tooltip.embedScene"), name: "exportEmbedSwitch", children: (0, jsx_runtime_1.jsx)(Switch_1.Switch, { name: "exportEmbedSwitch", checked: embedScene, onChange: (checked) => {
                                setEmbedScene(checked);
                                actionManager.executeAction(actionExport_1.actionChangeExportEmbedScene, "ui", checked);
                            } }) }), (0, jsx_runtime_1.jsx)(ExportSetting, { label: (0, i18n_1.t)("imageExportDialog.label.scale"), name: "exportScale", children: (0, jsx_runtime_1.jsx)(RadioGroup_1.RadioGroup, { name: "exportScale", value: exportScale, onChange: (scale) => {
                                setExportScale(scale);
                                actionManager.executeAction(actionExport_1.actionChangeExportScale, "ui", scale);
                            }, choices: common_1.EXPORT_SCALES.map((scale) => ({
                                value: scale,
                                label: `${scale}\u00d7`,
                            })) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "ImageExportModal__settings__buttons", children: [(0, jsx_runtime_1.jsx)(FilledButton_1.FilledButton, { className: "ImageExportModal__settings__buttons__button", label: (0, i18n_1.t)("imageExportDialog.title.exportToPng"), onClick: () => onExportImage(common_1.EXPORT_IMAGE_TYPES.png, exportedElements, {
                                    exportingFrame,
                                }), icon: icons_1.downloadIcon, children: (0, i18n_1.t)("imageExportDialog.button.exportToPng") }), (0, jsx_runtime_1.jsx)(FilledButton_1.FilledButton, { className: "ImageExportModal__settings__buttons__button", label: (0, i18n_1.t)("imageExportDialog.title.exportToSvg"), onClick: () => onExportImage(common_1.EXPORT_IMAGE_TYPES.svg, exportedElements, {
                                    exportingFrame,
                                }), icon: icons_1.downloadIcon, children: (0, i18n_1.t)("imageExportDialog.button.exportToSvg") }), (clipboard_1.probablySupportsClipboardBlob || common_1.isFirefox) && ((0, jsx_runtime_1.jsx)(FilledButton_1.FilledButton, { className: "ImageExportModal__settings__buttons__button", label: (0, i18n_1.t)("imageExportDialog.title.copyPngToClipboard"), status: copyStatus, onClick: async () => {
                                    await onExportImage(common_1.EXPORT_IMAGE_TYPES.clipboard, exportedElements, {
                                        exportingFrame,
                                    });
                                    onCopy();
                                }, icon: icons_1.copyIcon, children: (0, i18n_1.t)("imageExportDialog.button.copyPngToClipboard") }))] })] })] }));
};
const ExportSetting = ({ label, children, tooltip, name, }) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "ImageExportModal__settings__setting", title: label, children: [(0, jsx_runtime_1.jsxs)("label", { htmlFor: name, className: "ImageExportModal__settings__setting__label", children: [label, tooltip && ((0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { label: tooltip, long: true, children: icons_1.helpIcon }))] }), (0, jsx_runtime_1.jsx)("div", { className: "ImageExportModal__settings__setting__content", children: children })] }));
};
const ImageExportDialog = ({ elements, appState, files, actionManager, onExportImage, onCloseRequest, name, }) => {
    // we need to take a snapshot so that the exported state can't be modified
    // while the dialog is open
    const [{ appStateSnapshot, elementsSnapshot }] = (0, react_1.useState)(() => {
        return {
            appStateSnapshot: (0, common_1.cloneJSON)(appState),
            elementsSnapshot: (0, common_1.cloneJSON)(elements),
        };
    });
    return ((0, jsx_runtime_1.jsx)(Dialog_1.Dialog, { onCloseRequest: onCloseRequest, size: "wide", title: false, children: (0, jsx_runtime_1.jsx)(ImageExportModal, { elementsSnapshot: elementsSnapshot, appStateSnapshot: appStateSnapshot, files: files, actionManager: actionManager, onExportImage: onExportImage, name: name, exportWithDarkMode: appState.exportWithDarkMode }) }));
};
exports.ImageExportDialog = ImageExportDialog;
