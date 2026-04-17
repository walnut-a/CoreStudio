"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const actions_1 = require("../../actions");
const tunnels_1 = require("../../context/tunnels");
const Actions_1 = require("../Actions");
const HelpButton_1 = require("../HelpButton");
const Section_1 = require("../Section");
const Stack_1 = __importDefault(require("../Stack"));
const Footer = ({ appState, actionManager, showExitZenModeBtn, renderWelcomeScreen, }) => {
    const { FooterCenterTunnel, WelcomeScreenHelpHintTunnel } = (0, tunnels_1.useTunnels)();
    return ((0, jsx_runtime_1.jsxs)("footer", { role: "contentinfo", className: "layer-ui__wrapper__footer App-menu App-menu_bottom", children: [(0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("layer-ui__wrapper__footer-left zen-mode-transition", {
                    "layer-ui__wrapper__footer-left--transition-left": appState.zenModeEnabled,
                }), children: (0, jsx_runtime_1.jsx)(Stack_1.default.Col, { gap: 2, children: (0, jsx_runtime_1.jsxs)(Section_1.Section, { heading: "canvasActions", children: [(0, jsx_runtime_1.jsx)(Actions_1.ZoomActions, { renderAction: actionManager.renderAction, zoom: appState.zoom }), !appState.viewModeEnabled && ((0, jsx_runtime_1.jsx)(Actions_1.UndoRedoActions, { renderAction: actionManager.renderAction, className: (0, clsx_1.default)("zen-mode-transition", {
                                    "layer-ui__wrapper__footer-left--transition-bottom": appState.zenModeEnabled,
                                }) }))] }) }) }), (0, jsx_runtime_1.jsx)(FooterCenterTunnel.Out, {}), (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("layer-ui__wrapper__footer-right zen-mode-transition", {
                    "transition-right": appState.zenModeEnabled,
                }), children: (0, jsx_runtime_1.jsxs)("div", { style: { position: "relative" }, children: [renderWelcomeScreen && (0, jsx_runtime_1.jsx)(WelcomeScreenHelpHintTunnel.Out, {}), (0, jsx_runtime_1.jsx)(HelpButton_1.HelpButton, { onClick: () => actionManager.executeAction(actions_1.actionShortcuts) })] }) }), (0, jsx_runtime_1.jsx)(Actions_1.ExitZenModeButton, { actionManager: actionManager, showExitZenModeBtn: showExitZenModeBtn })] }));
};
exports.default = Footer;
Footer.displayName = "Footer";
