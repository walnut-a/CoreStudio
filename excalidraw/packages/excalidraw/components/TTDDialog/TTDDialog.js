"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTDDialog = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ui_appState_1 = require("../../context/ui-appState");
const i18n_1 = require("../../i18n");
const App_1 = require("../App");
const Dialog_1 = require("../Dialog");
const withInternalFallback_1 = require("../hoc/withInternalFallback");
const MermaidToExcalidraw_1 = __importDefault(require("./MermaidToExcalidraw"));
const TextToDiagram_1 = __importDefault(require("./TextToDiagram"));
const TTDDialogTabs_1 = __importDefault(require("./TTDDialogTabs"));
const TTDDialogTabTriggers_1 = require("./TTDDialogTabTriggers");
const TTDDialogTabTrigger_1 = require("./TTDDialogTabTrigger");
const TTDDialogTab_1 = require("./TTDDialogTab");
require("./TTDDialog.scss");
const TTDWelcomeMessage_1 = require("./TTDWelcomeMessage");
const TTDDialog = (props) => {
    const appState = (0, ui_appState_1.useUIAppState)();
    if (appState.openDialog?.name !== "ttd") {
        return null;
    }
    return (0, jsx_runtime_1.jsx)(TTDDialogBase, { ...props, tab: appState.openDialog.tab });
};
exports.TTDDialog = TTDDialog;
exports.TTDDialog.WelcomeMessage = TTDWelcomeMessage_1.TTDWelcomeMessage;
/**
 * Text to diagram (TTD) dialog
 */
const TTDDialogBase = (0, withInternalFallback_1.withInternalFallback)("TTDDialogBase", ({ tab, ...rest }) => {
    const app = (0, App_1.useApp)();
    const [mermaidToExcalidrawLib, setMermaidToExcalidrawLib] = (0, react_1.useState)({
        loaded: false,
        api: Promise.resolve().then(() => __importStar(require("@excalidraw/mermaid-to-excalidraw"))),
    });
    (0, react_1.useEffect)(() => {
        const fn = async () => {
            await mermaidToExcalidrawLib.api;
            setMermaidToExcalidrawLib((prev) => ({ ...prev, loaded: true }));
        };
        fn();
    }, [mermaidToExcalidrawLib.api]);
    return ((0, jsx_runtime_1.jsx)(Dialog_1.Dialog, { className: "ttd-dialog", onCloseRequest: () => {
            app.setOpenDialog(null);
        }, size: 1520, title: false, ...rest, autofocus: false, children: (0, jsx_runtime_1.jsxs)(TTDDialogTabs_1.default, { dialog: "ttd", tab: tab, children: ["__fallback" in rest && rest.__fallback ? ((0, jsx_runtime_1.jsx)("p", { className: "dialog-mermaid-title", children: (0, i18n_1.t)("mermaid.title") })) : ((0, jsx_runtime_1.jsxs)(TTDDialogTabTriggers_1.TTDDialogTabTriggers, { children: [(0, jsx_runtime_1.jsx)(TTDDialogTabTrigger_1.TTDDialogTabTrigger, { tab: "text-to-diagram", children: (0, jsx_runtime_1.jsxs)("div", { className: "ttd-dialog-tab-trigger__content", children: [(0, i18n_1.t)("labels.textToDiagram"), (0, jsx_runtime_1.jsx)("div", { className: "ttd-dialog-tab-trigger__badge", children: (0, i18n_1.t)("chat.aiBeta") })] }) }), (0, jsx_runtime_1.jsx)(TTDDialogTabTrigger_1.TTDDialogTabTrigger, { tab: "mermaid", children: (0, i18n_1.t)("mermaid.label") })] })), !("__fallback" in rest) && ((0, jsx_runtime_1.jsx)(TTDDialogTab_1.TTDDialogTab, { className: "ttd-dialog-content", tab: "text-to-diagram", children: (0, jsx_runtime_1.jsx)(TextToDiagram_1.default, { mermaidToExcalidrawLib: mermaidToExcalidrawLib, onTextSubmit: rest.onTextSubmit, renderWelcomeScreen: rest.renderWelcomeScreen, renderWarning: rest.renderWarning, persistenceAdapter: rest.persistenceAdapter }) })), (0, jsx_runtime_1.jsx)(TTDDialogTab_1.TTDDialogTab, { className: "ttd-dialog-content", tab: "mermaid", children: (0, jsx_runtime_1.jsx)(MermaidToExcalidraw_1.default, { mermaidToExcalidrawLib: mermaidToExcalidrawLib, isActive: tab === "mermaid" }) })] }) }));
});
