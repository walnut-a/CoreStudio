"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionExportWithDarkMode = exports.actionLoadScene = exports.actionSaveFileToDisk = exports.actionSaveToActiveFile = exports.actionChangeExportEmbedScene = exports.actionChangeExportBackground = exports.actionChangeExportScale = exports.actionChangeProjectName = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const App_1 = require("../components/App");
const CheckboxItem_1 = require("../components/CheckboxItem");
const DarkModeToggle_1 = require("../components/DarkModeToggle");
const ProjectName_1 = require("../components/ProjectName");
const Toast_1 = require("../components/Toast");
const ToolButton_1 = require("../components/ToolButton");
const Tooltip_1 = require("../components/Tooltip");
const icons_1 = require("../components/icons");
const data_1 = require("../data");
const blob_1 = require("../data/blob");
const filesystem_1 = require("../data/filesystem");
const resave_1 = require("../data/resave");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const export_1 = require("../scene/export");
require("../components/ToolIcon.scss");
const register_1 = require("./register");
exports.actionChangeProjectName = (0, register_1.register)({
    name: "changeProjectName",
    label: "labels.fileTitle",
    trackEvent: false,
    perform: (_elements, appState, value) => {
        return {
            appState: { ...appState, name: value },
            captureUpdate: element_2.CaptureUpdateAction.EVENTUALLY,
        };
    },
    PanelComponent: ({ appState, updateData, appProps, data, app }) => ((0, jsx_runtime_1.jsx)(ProjectName_1.ProjectName, { label: (0, i18n_1.t)("labels.fileTitle"), value: app.getName(), onChange: (name) => updateData(name), ignoreFocus: data?.ignoreFocus ?? false })),
});
exports.actionChangeExportScale = (0, register_1.register)({
    name: "changeExportScale",
    label: "imageExportDialog.scale",
    trackEvent: { category: "export", action: "scale" },
    perform: (_elements, appState, value) => {
        return {
            appState: { ...appState, exportScale: value },
            captureUpdate: element_2.CaptureUpdateAction.EVENTUALLY,
        };
    },
    PanelComponent: ({ elements: allElements, appState, updateData }) => {
        const elements = (0, element_1.getNonDeletedElements)(allElements);
        const exportSelected = (0, scene_1.isSomeElementSelected)(elements, appState);
        const exportedElements = exportSelected
            ? (0, scene_1.getSelectedElements)(elements, appState)
            : elements;
        return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: common_1.EXPORT_SCALES.map((s) => {
                const [width, height] = (0, export_1.getExportSize)(exportedElements, common_1.DEFAULT_EXPORT_PADDING, s);
                const scaleButtonTitle = `${(0, i18n_1.t)("imageExportDialog.label.scale")} ${s}x (${width}x${height})`;
                return ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { size: "small", type: "radio", icon: `${s}x`, name: "export-canvas-scale", title: scaleButtonTitle, "aria-label": scaleButtonTitle, id: "export-canvas-scale", checked: s === appState.exportScale, onChange: () => updateData(s) }, s));
            }) }));
    },
});
exports.actionChangeExportBackground = (0, register_1.register)({
    name: "changeExportBackground",
    label: "imageExportDialog.label.withBackground",
    trackEvent: { category: "export", action: "toggleBackground" },
    perform: (_elements, appState, value) => {
        return {
            appState: { ...appState, exportBackground: value },
            captureUpdate: element_2.CaptureUpdateAction.EVENTUALLY,
        };
    },
    PanelComponent: ({ appState, updateData }) => ((0, jsx_runtime_1.jsx)(CheckboxItem_1.CheckboxItem, { checked: appState.exportBackground, onChange: (checked) => updateData(checked), children: (0, i18n_1.t)("imageExportDialog.label.withBackground") })),
});
exports.actionChangeExportEmbedScene = (0, register_1.register)({
    name: "changeExportEmbedScene",
    label: "imageExportDialog.tooltip.embedScene",
    trackEvent: { category: "export", action: "embedScene" },
    perform: (_elements, appState, value) => {
        return {
            appState: { ...appState, exportEmbedScene: value },
            captureUpdate: element_2.CaptureUpdateAction.EVENTUALLY,
        };
    },
    PanelComponent: ({ appState, updateData }) => ((0, jsx_runtime_1.jsxs)(CheckboxItem_1.CheckboxItem, { checked: appState.exportEmbedScene, onChange: (checked) => updateData(checked), children: [(0, i18n_1.t)("imageExportDialog.label.embedScene"), (0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { label: (0, i18n_1.t)("imageExportDialog.tooltip.embedScene"), long: true, children: (0, jsx_runtime_1.jsx)("div", { className: "excalidraw-tooltip-icon", children: icons_1.questionCircle }) })] })),
});
// ---------------------------------------------------------------------------
// onExport interception helpers
// ---------------------------------------------------------------------------
let onExportInProgress = false;
const onProgressToast = (app, progress) => {
    const message = progress.message ?? (0, i18n_1.t)("progressDialog.defaultMessage");
    app.setAppState({
        toast: {
            message: progress.progress != null ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [message, (0, jsx_runtime_1.jsx)(Toast_1.Toast.ProgressBar, { progress: progress.progress })] })) : (message),
            duration: Infinity,
        },
    });
};
/** awaits host app's onExport result, and renders progress to the UI */
async function handleOnExportResult(onExportResult, opts) {
    if (opts.app.state.isLoading) {
        onProgressToast(opts.app, { progress: null });
        await opts.app.onStateChange({ predicate: (state) => !state.isLoading });
    }
    if (onExportResult != null &&
        typeof onExportResult === "object" &&
        Symbol.asyncIterator in onExportResult) {
        for await (const value of onExportResult) {
            if (opts.signal.aborted) {
                onExportResult.return();
                return;
            }
            if (value.type === "progress") {
                onProgressToast(opts.app, {
                    message: value.message,
                    progress: value.progress ?? null,
                });
            }
            else if (value.type === "done") {
                return;
            }
        }
        // Generator completed without explicit "done" message
        return;
    }
    if (onExportResult instanceof Promise) {
        onProgressToast(opts.app, { progress: null });
        await onExportResult;
    }
}
function prepareDataForJSONExport(elements, appState, files, app) {
    const abortController = new AbortController();
    const signal = abortController.signal;
    const dataPromise = new Promise(async (resolve) => {
        try {
            if (app.props.onExport) {
                await handleOnExportResult(app.props.onExport("json", {
                    elements,
                    appState,
                    files,
                }, {
                    signal,
                }), {
                    app,
                    signal,
                });
            }
        }
        catch (error) {
            if (error?.name === "AbortError") {
                // if abort error, assume it's a reaction on the signal being aborted
                console.warn(`onExport() aborted by host app (signal aborted: ${signal.aborted})`);
            }
            else {
                // non-abort error
                //
                console.error("Error during props.onExport() handling", error);
            }
            // either way, we currently don't allow host apps to cancel save actions
            // so we resolve to orig data
        }
        resolve({
            elements,
            appState,
            // return latest files in case they finished loading during onExport
            files: app.files,
        });
    });
    return {
        abortController,
        data: dataPromise,
    };
}
// ---------------------------------------------------------------------------
// Save actions
// ---------------------------------------------------------------------------
exports.actionSaveToActiveFile = (0, register_1.register)({
    name: "saveToActiveFile",
    label: "buttons.save",
    icon: icons_1.ExportIcon,
    trackEvent: { category: "export" },
    predicate: (elements, appState, props, app) => {
        return (!!app.props.UIOptions.canvasActions.saveToActiveFile &&
            !!appState.fileHandle &&
            !appState.viewModeEnabled);
    },
    perform: async (elements, appState, value, app) => {
        if (onExportInProgress) {
            return false;
        }
        onExportInProgress = true;
        const previousFileHandle = appState.fileHandle;
        const filename = app.getName();
        const { abortController, data: exportedDataPromise } = prepareDataForJSONExport(elements, appState, app.files, app);
        try {
            const { fileHandle } = (0, blob_1.isImageFileHandle)(previousFileHandle)
                ? await (0, resave_1.resaveAsImageWithScene)(exportedDataPromise, previousFileHandle, filename)
                : await (0, data_1.saveAsJSON)({
                    data: exportedDataPromise,
                    filename,
                    fileHandle: previousFileHandle,
                });
            return {
                captureUpdate: element_2.CaptureUpdateAction.NEVER,
                appState: {
                    fileHandle,
                    toast: {
                        message: previousFileHandle && fileHandle?.name
                            ? (0, i18n_1.t)("toast.fileSavedToFilename").replace("{filename}", `"${fileHandle.name}"`)
                            : (0, i18n_1.t)("toast.fileSaved"),
                        duration: 1500,
                    },
                },
            };
        }
        catch (error) {
            abortController.abort();
            if (error?.name !== "AbortError") {
                console.error(error);
            }
            else {
                console.warn(error);
            }
            return {
                captureUpdate: element_2.CaptureUpdateAction.NEVER,
                appState: {
                    toast: null,
                },
            };
        }
        finally {
            onExportInProgress = false;
        }
    },
    keyTest: (event) => event.key === common_1.KEYS.S && event[common_1.KEYS.CTRL_OR_CMD] && !event.shiftKey,
});
exports.actionSaveFileToDisk = (0, register_1.register)({
    name: "saveFileToDisk",
    label: "exportDialog.disk_title",
    icon: icons_1.ExportIcon,
    viewMode: true,
    trackEvent: { category: "export" },
    perform: async (elements, appState, value, app) => {
        if (onExportInProgress) {
            return false;
        }
        onExportInProgress = true;
        const { abortController, data: exportedDataPromise } = prepareDataForJSONExport(elements, appState, app.files, app);
        try {
            const { fileHandle: savedFileHandle } = await (0, data_1.saveAsJSON)({
                data: exportedDataPromise,
                filename: app.getName(),
                fileHandle: null,
            });
            return {
                captureUpdate: element_2.CaptureUpdateAction.NEVER,
                appState: {
                    openDialog: null,
                    fileHandle: savedFileHandle,
                    toast: { message: (0, i18n_1.t)("toast.fileSaved"), duration: 3000 },
                },
            };
        }
        catch (error) {
            abortController.abort();
            if (error?.name !== "AbortError") {
                console.error(error);
            }
            else {
                console.warn(error);
            }
            return {
                captureUpdate: element_2.CaptureUpdateAction.NEVER,
                appState: {
                    toast: null,
                },
            };
        }
        finally {
            onExportInProgress = false;
        }
    },
    keyTest: (event) => event.key.toLowerCase() === common_1.KEYS.S &&
        event.shiftKey &&
        event[common_1.KEYS.CTRL_OR_CMD],
    PanelComponent: ({ updateData }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", icon: icons_1.saveAs, title: (0, i18n_1.t)("buttons.saveAs"), "aria-label": (0, i18n_1.t)("buttons.saveAs"), showAriaLabel: (0, App_1.useEditorInterface)().formFactor === "phone", hidden: !filesystem_1.nativeFileSystemSupported, onClick: () => updateData(null), "data-testid": "save-as-button" })),
});
exports.actionLoadScene = (0, register_1.register)({
    name: "loadScene",
    label: "buttons.load",
    trackEvent: { category: "export" },
    predicate: (elements, appState, props, app) => {
        return (!!app.props.UIOptions.canvasActions.loadScene && !appState.viewModeEnabled);
    },
    perform: async (elements, appState, _, app) => {
        try {
            const { elements: loadedElements, appState: loadedAppState, files, } = await (0, data_1.loadFromJSON)(appState, elements);
            return {
                elements: loadedElements,
                appState: loadedAppState,
                files,
                captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
            };
        }
        catch (error) {
            if (error?.name === "AbortError") {
                console.warn(error);
                return false;
            }
            return {
                elements,
                appState: { ...appState, errorMessage: error.message },
                files: app.files,
                captureUpdate: element_2.CaptureUpdateAction.EVENTUALLY,
            };
        }
    },
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] && event.key === common_1.KEYS.O,
});
exports.actionExportWithDarkMode = (0, register_1.register)({
    name: "exportWithDarkMode",
    label: "imageExportDialog.label.darkMode",
    trackEvent: { category: "export", action: "toggleTheme" },
    perform: (_elements, appState, value, app) => {
        app.sessionExportThemeOverride = value ? common_1.THEME.DARK : common_1.THEME.LIGHT;
        return {
            appState: { ...appState, exportWithDarkMode: value },
            captureUpdate: element_2.CaptureUpdateAction.EVENTUALLY,
        };
    },
    PanelComponent: ({ appState, updateData }) => ((0, jsx_runtime_1.jsx)("div", { style: {
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "-45px",
            marginBottom: "10px",
        }, children: (0, jsx_runtime_1.jsx)(DarkModeToggle_1.DarkModeToggle, { value: appState.exportWithDarkMode ? common_1.THEME.DARK : common_1.THEME.LIGHT, onChange: (theme) => {
                updateData(theme === common_1.THEME.DARK);
            }, title: (0, i18n_1.t)("imageExportDialog.label.darkMode") }) })),
});
