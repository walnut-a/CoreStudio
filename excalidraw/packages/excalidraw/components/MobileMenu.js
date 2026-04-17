"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileMenu = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const tunnels_1 = require("../context/tunnels");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const scrollbars_1 = require("../scene/scrollbars");
const Actions_1 = require("./Actions");
const MobileToolBar_1 = require("./MobileToolBar");
const FixedSideContainer_1 = require("./FixedSideContainer");
const Island_1 = require("./Island");
const PenModeButton_1 = require("./PenModeButton");
const MobileMenu = ({ appState, elements, actionManager, setAppState, onHandToolToggle, renderTopLeftUI, renderTopRightUI, renderSidebars, renderWelcomeScreen, UIOptions, app, onPenModeToggle, }) => {
    const { WelcomeScreenCenterTunnel, MainMenuTunnel, DefaultSidebarTriggerTunnel, } = (0, tunnels_1.useTunnels)();
    const renderAppTopBar = () => {
        if (appState.openDialog?.name === "elementLinkSelector") {
            return null;
        }
        const topRightUI = ((0, jsx_runtime_1.jsxs)("div", { className: "excalidraw-ui-top-right", children: [renderTopRightUI?.(true, appState) ??
                    (!appState.viewModeEnabled && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PenModeButton_1.PenModeButton, { checked: appState.penMode, onChange: () => onPenModeToggle(null), title: (0, i18n_1.t)("toolBar.penMode"), isMobile: true, penDetected: appState.penDetected }), (0, jsx_runtime_1.jsx)(DefaultSidebarTriggerTunnel.Out, {})] }))), appState.viewModeEnabled && ((0, jsx_runtime_1.jsx)(Actions_1.ExitViewModeButton, { actionManager: actionManager }))] }));
        const topLeftUI = ((0, jsx_runtime_1.jsxs)("div", { className: "excalidraw-ui-top-left", children: [renderTopLeftUI?.(true, appState), (0, jsx_runtime_1.jsx)(MainMenuTunnel.Out, {})] }));
        return ((0, jsx_runtime_1.jsxs)("div", { className: "App-toolbar-content", style: {
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
            }, children: [topLeftUI, topRightUI] }));
    };
    const renderToolbar = () => {
        return ((0, jsx_runtime_1.jsx)(MobileToolBar_1.MobileToolBar, { app: app, onHandToolToggle: onHandToolToggle, setAppState: setAppState }));
    };
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [renderSidebars(), (0, jsx_runtime_1.jsx)("div", { className: "App-welcome-screen", children: renderWelcomeScreen && (0, jsx_runtime_1.jsx)(WelcomeScreenCenterTunnel.Out, {}) }), !appState.viewModeEnabled && ((0, jsx_runtime_1.jsxs)("div", { className: "App-bottom-bar", style: {
                    marginBottom: scrollbars_1.SCROLLBAR_WIDTH + scrollbars_1.SCROLLBAR_MARGIN,
                }, children: [(0, jsx_runtime_1.jsx)(Actions_1.MobileShapeActions, { appState: appState, elementsMap: app.scene.getNonDeletedElementsMap(), renderAction: actionManager.renderAction, app: app, setAppState: setAppState }), (0, jsx_runtime_1.jsxs)(Island_1.Island, { className: "App-toolbar", children: [!appState.viewModeEnabled &&
                                appState.openDialog?.name !== "elementLinkSelector" &&
                                renderToolbar(), appState.scrolledOutside &&
                                !appState.openMenu &&
                                !appState.openSidebar && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "scroll-back-to-content", onClick: () => {
                                    setAppState((appState) => ({
                                        ...(0, scene_1.calculateScrollCenter)(elements, appState),
                                    }));
                                }, children: (0, i18n_1.t)("buttons.scrollBackToContent") }))] })] })), (0, jsx_runtime_1.jsx)(FixedSideContainer_1.FixedSideContainer, { side: "top", className: "App-top-bar", children: renderAppTopBar() })] }));
};
exports.MobileMenu = MobileMenu;
