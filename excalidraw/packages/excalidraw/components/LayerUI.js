"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = __importDefault(require("react"));
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const actions_1 = require("../actions");
const analytics_1 = require("../analytics");
const tunnels_1 = require("../context/tunnels");
const ui_appState_1 = require("../context/ui-appState");
const editor_jotai_1 = require("../editor-jotai");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const Actions_1 = require("./Actions");
const LoadingMessage_1 = require("./LoadingMessage");
const LockButton_1 = require("./LockButton");
const MobileMenu_1 = require("./MobileMenu");
const PasteChartDialog_1 = require("./PasteChartDialog");
const Section_1 = require("./Section");
const Stack_1 = __importDefault(require("./Stack"));
const UserList_1 = require("./UserList");
const PenModeButton_1 = require("./PenModeButton");
const Footer_1 = __importDefault(require("./footer/Footer"));
const Sidebar_1 = require("./Sidebar/Sidebar");
const MainMenu_1 = __importDefault(require("./main-menu/MainMenu"));
const ActiveConfirmDialog_1 = require("./ActiveConfirmDialog");
const App_1 = require("./App");
const OverwriteConfirm_1 = require("./OverwriteConfirm/OverwriteConfirm");
const icons_1 = require("./icons");
const DefaultSidebar_1 = require("./DefaultSidebar");
const TTDDialog_1 = require("./TTDDialog/TTDDialog");
const Stats_1 = require("./Stats");
const ElementLinkDialog_1 = __importDefault(require("./ElementLinkDialog"));
const ErrorDialog_1 = require("./ErrorDialog");
const EyeDropper_1 = require("./EyeDropper");
const FixedSideContainer_1 = require("./FixedSideContainer");
const HelpDialog_1 = require("./HelpDialog");
const HintViewer_1 = require("./HintViewer");
const ImageExportDialog_1 = require("./ImageExportDialog");
const Island_1 = require("./Island");
const JSONExportDialog_1 = require("./JSONExportDialog");
const LaserPointerButton_1 = require("./LaserPointerButton");
const Toast_1 = require("./Toast");
require("./LayerUI.scss");
require("./Toolbar.scss");
const DefaultMainMenu = ({ UIOptions }) => {
    return ((0, jsx_runtime_1.jsxs)(MainMenu_1.default, { __fallback: true, children: [(0, jsx_runtime_1.jsx)(MainMenu_1.default.DefaultItems.LoadScene, {}), (0, jsx_runtime_1.jsx)(MainMenu_1.default.DefaultItems.SaveToActiveFile, {}), UIOptions.canvasActions.export && (0, jsx_runtime_1.jsx)(MainMenu_1.default.DefaultItems.Export, {}), UIOptions.canvasActions.saveAsImage && ((0, jsx_runtime_1.jsx)(MainMenu_1.default.DefaultItems.SaveAsImage, {})), (0, jsx_runtime_1.jsx)(MainMenu_1.default.DefaultItems.SearchMenu, {}), (0, jsx_runtime_1.jsx)(MainMenu_1.default.DefaultItems.Help, {}), (0, jsx_runtime_1.jsx)(MainMenu_1.default.DefaultItems.ClearCanvas, {}), (0, jsx_runtime_1.jsx)(MainMenu_1.default.Separator, {}), (0, jsx_runtime_1.jsx)(MainMenu_1.default.Group, { title: "Excalidraw links", children: (0, jsx_runtime_1.jsx)(MainMenu_1.default.DefaultItems.Socials, {}) }), (0, jsx_runtime_1.jsx)(MainMenu_1.default.Separator, {}), (0, jsx_runtime_1.jsx)(MainMenu_1.default.DefaultItems.ToggleTheme, {}), (0, jsx_runtime_1.jsx)(MainMenu_1.default.DefaultItems.ChangeCanvasBackground, {})] }));
};
const DefaultOverwriteConfirmDialog = () => {
    return ((0, jsx_runtime_1.jsxs)(OverwriteConfirm_1.OverwriteConfirmDialog, { __fallback: true, children: [(0, jsx_runtime_1.jsx)(OverwriteConfirm_1.OverwriteConfirmDialog.Actions.SaveToDisk, {}), (0, jsx_runtime_1.jsx)(OverwriteConfirm_1.OverwriteConfirmDialog.Actions.ExportToImage, {})] }));
};
const LayerUI = ({ actionManager, appState, files, setAppState, elements, canvas, onLockToggle, onHandToolToggle, onPenModeToggle, showExitZenModeBtn, renderTopLeftUI, renderTopRightUI, renderCustomStats, UIOptions, onExportImage, renderWelcomeScreen, children, app, isCollaborating, generateLinkForSelection, }) => {
    const editorInterface = (0, App_1.useEditorInterface)();
    const stylesPanelMode = (0, App_1.useStylesPanelMode)();
    const isCompactStylesPanel = stylesPanelMode === "compact";
    const tunnels = (0, tunnels_1.useInitializeTunnels)();
    const spacing = isCompactStylesPanel
        ? {
            menuTopGap: 4,
            toolbarColGap: 4,
            toolbarRowGap: 1,
            toolbarInnerRowGap: 0.5,
            islandPadding: 1,
            collabMarginLeft: 8,
        }
        : {
            menuTopGap: 6,
            toolbarColGap: 4,
            toolbarRowGap: 1,
            toolbarInnerRowGap: 1,
            islandPadding: 1,
            collabMarginLeft: 8,
        };
    const TunnelsJotaiProvider = tunnels.tunnelsJotai.Provider;
    const [eyeDropperState, setEyeDropperState] = (0, editor_jotai_1.useAtom)(EyeDropper_1.activeEyeDropperAtom);
    const renderJSONExportDialog = () => {
        if (!UIOptions.canvasActions.export) {
            return null;
        }
        return ((0, jsx_runtime_1.jsx)(JSONExportDialog_1.JSONExportDialog, { elements: elements, appState: appState, files: files, actionManager: actionManager, exportOpts: UIOptions.canvasActions.export, canvas: canvas, setAppState: setAppState }));
    };
    const renderImageExportDialog = () => {
        if (!UIOptions.canvasActions.saveAsImage ||
            appState.openDialog?.name !== "imageExport") {
            return null;
        }
        return ((0, jsx_runtime_1.jsx)(ImageExportDialog_1.ImageExportDialog, { elements: elements, appState: appState, files: files, actionManager: actionManager, onExportImage: onExportImage, onCloseRequest: () => setAppState({ openDialog: null }), name: app.getName() }));
    };
    const renderCanvasActions = () => ((0, jsx_runtime_1.jsxs)("div", { style: { position: "relative" }, children: [(0, jsx_runtime_1.jsx)(tunnels.MainMenuTunnel.Out, {}), renderWelcomeScreen && (0, jsx_runtime_1.jsx)(tunnels.WelcomeScreenMenuHintTunnel.Out, {})] }));
    const renderSelectedShapeActions = () => {
        const isCompactMode = isCompactStylesPanel;
        return ((0, jsx_runtime_1.jsx)(Section_1.Section, { heading: "selectedShapeActions", className: (0, clsx_1.default)("selected-shape-actions zen-mode-transition", {
                "transition-left": appState.zenModeEnabled,
            }), children: isCompactMode ? ((0, jsx_runtime_1.jsx)(Island_1.Island, { className: (0, clsx_1.default)("compact-shape-actions-island"), padding: 0, style: {
                    // we want to make sure this doesn't overflow so subtracting the
                    // approximate height of hamburgerMenu + footer
                    maxHeight: `${appState.height - 166}px`,
                }, children: (0, jsx_runtime_1.jsx)(Actions_1.CompactShapeActions, { appState: appState, elementsMap: app.scene.getNonDeletedElementsMap(), renderAction: actionManager.renderAction, app: app, setAppState: setAppState }) })) : ((0, jsx_runtime_1.jsx)(Island_1.Island, { className: common_1.CLASSES.SHAPE_ACTIONS_MENU, padding: 2, style: {
                    // we want to make sure this doesn't overflow so subtracting the
                    // approximate height of hamburgerMenu + footer
                    maxHeight: `${appState.height - 166}px`,
                }, children: (0, jsx_runtime_1.jsx)(Actions_1.SelectedShapeActions, { appState: appState, elementsMap: app.scene.getNonDeletedElementsMap(), renderAction: actionManager.renderAction, app: app }) })) }));
    };
    const renderFixedSideContainer = () => {
        const shouldRenderSelectedShapeActions = (0, element_2.showSelectedShapeActions)(appState, elements);
        const shouldShowStats = appState.stats.open &&
            !appState.zenModeEnabled &&
            !appState.viewModeEnabled &&
            appState.openDialog?.name !== "elementLinkSelector";
        return ((0, jsx_runtime_1.jsx)(FixedSideContainer_1.FixedSideContainer, { side: "top", children: (0, jsx_runtime_1.jsxs)("div", { className: "App-menu App-menu_top", children: [(0, jsx_runtime_1.jsxs)(Stack_1.default.Col, { gap: spacing.menuTopGap, className: (0, clsx_1.default)("App-menu_top__left"), children: [renderCanvasActions(), (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("selected-shape-actions-container", {
                                    "selected-shape-actions-container--compact": isCompactStylesPanel,
                                }), children: shouldRenderSelectedShapeActions && renderSelectedShapeActions() })] }), !appState.viewModeEnabled &&
                        appState.openDialog?.name !== "elementLinkSelector" && ((0, jsx_runtime_1.jsx)(Section_1.Section, { heading: "shapes", className: "shapes-section", children: (heading) => ((0, jsx_runtime_1.jsxs)("div", { style: { position: "relative" }, children: [renderWelcomeScreen && ((0, jsx_runtime_1.jsx)(tunnels.WelcomeScreenToolbarHintTunnel.Out, {})), (0, jsx_runtime_1.jsx)(Stack_1.default.Col, { gap: spacing.toolbarColGap, align: "start", children: (0, jsx_runtime_1.jsxs)(Stack_1.default.Row, { gap: spacing.toolbarRowGap, className: (0, clsx_1.default)("App-toolbar-container", {
                                            "zen-mode": appState.zenModeEnabled,
                                        }), children: [(0, jsx_runtime_1.jsxs)(Island_1.Island, { padding: spacing.islandPadding, className: (0, clsx_1.default)("App-toolbar", {
                                                    "zen-mode": appState.zenModeEnabled,
                                                    "App-toolbar--compact": isCompactStylesPanel,
                                                }), children: [(0, jsx_runtime_1.jsx)(HintViewer_1.HintViewer, { appState: appState, isMobile: editorInterface.formFactor === "phone", editorInterface: editorInterface, app: app }), heading, (0, jsx_runtime_1.jsxs)(Stack_1.default.Row, { gap: spacing.toolbarInnerRowGap, children: [(0, jsx_runtime_1.jsx)(PenModeButton_1.PenModeButton, { zenModeEnabled: appState.zenModeEnabled, checked: appState.penMode, onChange: () => onPenModeToggle(null), title: (0, i18n_1.t)("toolBar.penMode"), penDetected: appState.penDetected }), (0, jsx_runtime_1.jsx)(LockButton_1.LockButton, { checked: appState.activeTool.locked, onChange: onLockToggle, title: (0, i18n_1.t)("toolBar.lock") }), (0, jsx_runtime_1.jsx)("div", { className: "App-toolbar__divider" }), (0, jsx_runtime_1.jsx)(Actions_1.ShapesSwitcher, { setAppState: setAppState, activeTool: appState.activeTool, UIOptions: UIOptions, app: app })] })] }), isCollaborating && ((0, jsx_runtime_1.jsx)(Island_1.Island, { style: {
                                                    marginLeft: spacing.collabMarginLeft,
                                                    alignSelf: "center",
                                                    height: "fit-content",
                                                }, children: (0, jsx_runtime_1.jsx)(LaserPointerButton_1.LaserPointerButton, { title: (0, i18n_1.t)("toolBar.laser"), checked: appState.activeTool.type === common_1.TOOL_TYPE.laser, onChange: () => app.setActiveTool({ type: common_1.TOOL_TYPE.laser }), isMobile: true }) }))] }) })] })) })), (0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("layer-ui__wrapper__top-right zen-mode-transition", {
                            "transition-right": appState.zenModeEnabled,
                            "layer-ui__wrapper__top-right--compact": isCompactStylesPanel,
                        }), children: [appState.collaborators.size > 0 && ((0, jsx_runtime_1.jsx)(UserList_1.UserList, { collaborators: appState.collaborators, userToFollow: appState.userToFollow?.socketId || null })), renderTopRightUI?.(editorInterface.formFactor === "phone", appState), !appState.viewModeEnabled &&
                                appState.openDialog?.name !== "elementLinkSelector" &&
                                // hide button when sidebar docked
                                (!isSidebarDocked ||
                                    appState.openSidebar?.name !== common_1.DEFAULT_SIDEBAR.name) && ((0, jsx_runtime_1.jsx)(tunnels.DefaultSidebarTriggerTunnel.Out, {})), shouldShowStats && ((0, jsx_runtime_1.jsx)(Stats_1.Stats, { app: app, onClose: () => {
                                    actionManager.executeAction(actions_1.actionToggleStats);
                                }, renderCustomStats: renderCustomStats }))] })] }) }));
    };
    const renderSidebars = () => {
        return ((0, jsx_runtime_1.jsx)(DefaultSidebar_1.DefaultSidebar, { __fallback: true, onDock: (docked) => {
                (0, analytics_1.trackEvent)("sidebar", `toggleDock (${docked ? "dock" : "undock"})`, `(${editorInterface.formFactor === "phone" ? "mobile" : "desktop"})`);
            } }));
    };
    const isSidebarDocked = (0, editor_jotai_1.useAtomValue)(Sidebar_1.isSidebarDockedAtom);
    const layerUIJSX = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [children, (0, jsx_runtime_1.jsx)(DefaultMainMenu, { UIOptions: UIOptions }), (0, jsx_runtime_1.jsx)(DefaultSidebar_1.DefaultSidebar.Trigger, { __fallback: true, icon: icons_1.sidebarRightIcon, title: (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.library")), onToggle: (open) => {
                    if (open) {
                        (0, analytics_1.trackEvent)("sidebar", `${common_1.DEFAULT_SIDEBAR.name} (open)`, `button (${editorInterface.formFactor === "phone" ? "mobile" : "desktop"})`);
                    }
                }, tab: common_1.DEFAULT_SIDEBAR.defaultTab }), (0, jsx_runtime_1.jsx)(DefaultOverwriteConfirmDialog, {}), appState.openDialog?.name === "ttd" && (0, jsx_runtime_1.jsx)(TTDDialog_1.TTDDialog, { __fallback: true }), appState.isLoading && (0, jsx_runtime_1.jsx)(LoadingMessage_1.LoadingMessage, { delay: 250 }), appState.errorMessage && ((0, jsx_runtime_1.jsx)(ErrorDialog_1.ErrorDialog, { onClose: () => setAppState({ errorMessage: null }), children: appState.errorMessage })), eyeDropperState && editorInterface.formFactor !== "phone" && ((0, jsx_runtime_1.jsx)(EyeDropper_1.EyeDropper, { colorPickerType: eyeDropperState.colorPickerType, onCancel: () => {
                    setEyeDropperState(null);
                }, onChange: (colorPickerType, color, selectedElements, { altKey }) => {
                    if (colorPickerType !== "elementBackground" &&
                        colorPickerType !== "elementStroke") {
                        return;
                    }
                    if (selectedElements.length) {
                        for (const element of selectedElements) {
                            (0, element_1.mutateElement)(element, (0, common_1.arrayToMap)(elements), {
                                [altKey && eyeDropperState.swapPreviewOnAlt
                                    ? colorPickerType === "elementBackground"
                                        ? "strokeColor"
                                        : "backgroundColor"
                                    : colorPickerType === "elementBackground"
                                        ? "backgroundColor"
                                        : "strokeColor"]: color,
                            });
                            element_3.ShapeCache.delete(element);
                        }
                        app.scene.triggerUpdate();
                    }
                    else if (colorPickerType === "elementBackground") {
                        setAppState({
                            currentItemBackgroundColor: color,
                        });
                    }
                    else {
                        setAppState({ currentItemStrokeColor: color });
                    }
                }, onSelect: (color, event) => {
                    setEyeDropperState((state) => {
                        return state?.keepOpenOnAlt && event.altKey ? state : null;
                    });
                    eyeDropperState?.onSelect?.(color, event);
                } })), appState.openDialog?.name === "help" && ((0, jsx_runtime_1.jsx)(HelpDialog_1.HelpDialog, { onClose: () => {
                    setAppState({ openDialog: null });
                } })), (0, jsx_runtime_1.jsx)(ActiveConfirmDialog_1.ActiveConfirmDialog, {}), appState.openDialog?.name === "elementLinkSelector" && ((0, jsx_runtime_1.jsx)(ElementLinkDialog_1.default, { sourceElementId: appState.openDialog.sourceElementId, onClose: () => {
                    setAppState({
                        openDialog: null,
                    });
                }, scene: app.scene, appState: appState, generateLinkForSelection: generateLinkForSelection })), (0, jsx_runtime_1.jsx)(tunnels.OverwriteConfirmDialogTunnel.Out, {}), renderImageExportDialog(), renderJSONExportDialog(), appState.openDialog?.name === "charts" && ((0, jsx_runtime_1.jsx)(PasteChartDialog_1.PasteChartDialog, { data: appState.openDialog.data, rawText: appState.openDialog.rawText, onClose: () => setAppState({
                    openDialog: null,
                }) })), editorInterface.formFactor === "phone" && ((0, jsx_runtime_1.jsx)(MobileMenu_1.MobileMenu, { app: app, appState: appState, elements: elements, actionManager: actionManager, renderJSONExportDialog: renderJSONExportDialog, renderImageExportDialog: renderImageExportDialog, setAppState: setAppState, onHandToolToggle: onHandToolToggle, onPenModeToggle: onPenModeToggle, renderTopLeftUI: renderTopLeftUI, renderTopRightUI: renderTopRightUI, renderSidebars: renderSidebars, renderWelcomeScreen: renderWelcomeScreen, UIOptions: UIOptions })), editorInterface.formFactor !== "phone" && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "layer-ui__wrapper", style: appState.openSidebar &&
                            isSidebarDocked &&
                            editorInterface.canFitSidebar
                            ? { width: `calc(100% - var(--right-sidebar-width))` }
                            : {}, children: [renderWelcomeScreen && (0, jsx_runtime_1.jsx)(tunnels.WelcomeScreenCenterTunnel.Out, {}), renderFixedSideContainer(), (0, jsx_runtime_1.jsx)(Footer_1.default, { appState: appState, actionManager: actionManager, showExitZenModeBtn: showExitZenModeBtn, renderWelcomeScreen: renderWelcomeScreen }), (appState.toast || appState.scrolledOutside) && ((0, jsx_runtime_1.jsxs)("div", { className: "floating-status-stack", children: [appState.toast && ((0, jsx_runtime_1.jsx)(Toast_1.Toast, { message: appState.toast.message, onClose: () => setAppState({ toast: null }), duration: appState.toast.duration, closable: appState.toast.closable })), !appState.toast && appState.scrolledOutside && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "scroll-back-to-content", onClick: () => {
                                            setAppState((appState) => ({
                                                ...(0, scene_1.calculateScrollCenter)(elements, appState),
                                            }));
                                        }, children: (0, i18n_1.t)("buttons.scrollBackToContent") }))] }))] }), renderSidebars()] }))] }));
    return ((0, jsx_runtime_1.jsx)(ui_appState_1.UIAppStateContext.Provider, { value: appState, children: (0, jsx_runtime_1.jsx)(TunnelsJotaiProvider, { children: (0, jsx_runtime_1.jsx)(tunnels_1.TunnelsContext.Provider, { value: tunnels, children: layerUIJSX }) }) }));
};
const stripIrrelevantAppStateProps = (appState) => {
    const { startBoundElement, cursorButton, scrollX, scrollY, ...ret } = appState;
    return ret;
};
const areEqual = (prevProps, nextProps) => {
    // short-circuit early
    if (prevProps.children !== nextProps.children) {
        return false;
    }
    const { canvas: _pC, appState: prevAppState, ...prev } = prevProps;
    const { canvas: _nC, appState: nextAppState, ...next } = nextProps;
    return ((0, common_1.isShallowEqual)(
    // asserting AppState because we're being passed the whole AppState
    // but resolve to only the UI-relevant props
    stripIrrelevantAppStateProps(prevAppState), stripIrrelevantAppStateProps(nextAppState), {
        selectedElementIds: common_1.isShallowEqual,
        selectedGroupIds: common_1.isShallowEqual,
    }) && (0, common_1.isShallowEqual)(prev, next));
};
exports.default = react_1.default.memo(LayerUI, areEqual);
