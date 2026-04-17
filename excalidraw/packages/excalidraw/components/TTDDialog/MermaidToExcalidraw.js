"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const App_1 = require("../App");
const icons_1 = require("../icons");
const EditorLocalStorage_1 = require("../../data/EditorLocalStorage");
const i18n_1 = require("../../i18n");
const Trans_1 = __importDefault(require("../Trans"));
const ui_appState_1 = require("../../context/ui-appState");
const TTDDialogInput_1 = require("./TTDDialogInput");
const TTDDialogOutput_1 = require("./TTDDialogOutput");
const TTDDialogPanel_1 = require("./TTDDialogPanel");
const TTDDialogPanels_1 = require("./TTDDialogPanels");
const TTDDialogSubmitShortcut_1 = require("./TTDDialogSubmitShortcut");
const mermaidError_1 = require("./utils/mermaidError");
const mermaidAutoFix_1 = require("./utils/mermaidAutoFix");
const common_2 = require("./common");
require("./MermaidToExcalidraw.scss");
const MERMAID_EXAMPLE = "flowchart TD\n A[Christmas] -->|Get money| B(Go shopping)\n B --> C{Let me think}\n C -->|One| D[Laptop]\n C -->|Two| E[iPhone]\n C -->|Three| F[Car]";
const debouncedSaveMermaidDefinition = (0, common_1.debounce)(common_2.saveMermaidDataToStorage, 300);
const AUTO_FIX_DEBOUNCE_MS = 500;
const AUTO_FIX_MAX_DEPTH = 4;
const AUTO_FIX_MAX_CANDIDATES = 30;
const getErrorMessage = (error) => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    if (error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string") {
        return error.message;
    }
    return "";
};
const MermaidToExcalidraw = ({ mermaidToExcalidrawLib, isActive, }) => {
    const [text, setText] = (0, react_1.useState)(() => EditorLocalStorage_1.EditorLocalStorage.get(common_1.EDITOR_LS_KEYS.MERMAID_TO_EXCALIDRAW) ||
        MERMAID_EXAMPLE);
    const deferredText = (0, react_1.useDeferredValue)(text);
    const [error, setError] = (0, react_1.useState)(null);
    const [autoFixCandidate, setAutoFixCandidate] = (0, react_1.useState)(null);
    const errorLine = (() => {
        if (!error?.message) {
            return null;
        }
        return (0, mermaidError_1.getMermaidErrorLineNumber)(error.message, deferredText);
    })();
    const canvasRef = (0, react_1.useRef)(null);
    const data = (0, react_1.useRef)({ elements: [], files: null });
    const app = (0, App_1.useApp)();
    const { theme } = (0, ui_appState_1.useUIAppState)();
    (0, react_1.useEffect)(() => {
        const doRender = async () => {
            try {
                if (!deferredText.trim()) {
                    (0, common_2.resetPreview)({ canvasRef, setError });
                    return;
                }
                const result = await (0, common_2.convertMermaidToExcalidraw)({
                    canvasRef,
                    data,
                    mermaidToExcalidrawLib,
                    setError,
                    mermaidDefinition: deferredText,
                    theme,
                });
                if (!result.success) {
                    const err = result.error ?? new Error("Invalid mermaid definition");
                    setError(err);
                }
            }
            catch (err) {
                if ((0, common_1.isDevEnv)()) {
                    console.error("Failed to parse mermaid definition", err);
                }
            }
        };
        if (isActive) {
            doRender();
            debouncedSaveMermaidDefinition(deferredText);
        }
    }, [deferredText, mermaidToExcalidrawLib, isActive, theme]);
    (0, react_1.useEffect)(() => () => {
        debouncedSaveMermaidDefinition.flush();
    }, []);
    (0, react_1.useEffect)(() => {
        const errorMessage = error?.message ?? "";
        const sourceText = deferredText;
        const shouldTryAutoFix = isActive &&
            (0, mermaidError_1.isMermaidAutoFixableError)(errorMessage) &&
            !!sourceText.trim() &&
            mermaidToExcalidrawLib.loaded;
        if (!shouldTryAutoFix) {
            setAutoFixCandidate(null);
            return;
        }
        const candidates = (0, mermaidAutoFix_1.getMermaidAutoFixCandidates)(sourceText, errorMessage);
        if (!candidates.length) {
            setAutoFixCandidate(null);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const api = await mermaidToExcalidrawLib.api;
                const seen = new Set([sourceText]);
                const queue = candidates.map((candidate) => ({
                    text: candidate,
                    depth: 1,
                }));
                let triedCandidates = 0;
                while (queue.length > 0 && triedCandidates < AUTO_FIX_MAX_CANDIDATES) {
                    const current = queue.shift();
                    if (!current || seen.has(current.text)) {
                        continue;
                    }
                    seen.add(current.text);
                    triedCandidates += 1;
                    try {
                        await api.parseMermaidToExcalidraw(current.text);
                        if (!cancelled) {
                            setAutoFixCandidate(current.text);
                        }
                        return;
                    }
                    catch (candidateError) {
                        if (current.depth >= AUTO_FIX_MAX_DEPTH) {
                            continue;
                        }
                        const nextErrorMessage = getErrorMessage(candidateError);
                        if (!nextErrorMessage) {
                            continue;
                        }
                        const nextCandidates = (0, mermaidAutoFix_1.getMermaidAutoFixCandidates)(current.text, nextErrorMessage);
                        for (const nextCandidate of nextCandidates) {
                            if (!seen.has(nextCandidate)) {
                                queue.push({
                                    text: nextCandidate,
                                    depth: current.depth + 1,
                                });
                            }
                        }
                    }
                }
            }
            catch {
                // ignore auto-fix probe errors
            }
            if (!cancelled) {
                setAutoFixCandidate(null);
            }
        }, AUTO_FIX_DEBOUNCE_MS);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [deferredText, error?.message, isActive, mermaidToExcalidrawLib]);
    const onInsertToEditor = () => {
        (0, common_2.insertToEditor)({
            app,
            data,
            text,
            shouldSaveMermaidDataToStorage: true,
        });
    };
    const onApplyAutoFix = () => {
        if (!autoFixCandidate) {
            return;
        }
        setText(autoFixCandidate);
    };
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "ttd-dialog-desc", children: (0, jsx_runtime_1.jsx)(Trans_1.default, { i18nKey: "mermaid.description", flowchartLink: (el) => ((0, jsx_runtime_1.jsx)("a", { href: "https://mermaid.js.org/syntax/flowchart.html", target: "_blank", rel: "noreferrer", children: el })), sequenceLink: (el) => ((0, jsx_runtime_1.jsx)("a", { href: "https://mermaid.js.org/syntax/sequenceDiagram.html", target: "_blank", rel: "noreferrer", children: el })), classLink: (el) => ((0, jsx_runtime_1.jsx)("a", { href: "https://mermaid.js.org/syntax/classDiagram.html", target: "_blank", rel: "noreferrer", children: el })), erdLink: (el) => ((0, jsx_runtime_1.jsx)("a", { href: "https://mermaid.js.org/syntax/entityRelationshipDiagram.html", target: "_blank", rel: "noreferrer", children: el })) }) }), (0, jsx_runtime_1.jsxs)(TTDDialogPanels_1.TTDDialogPanels, { children: [(0, jsx_runtime_1.jsx)(TTDDialogPanel_1.TTDDialogPanel, { children: (0, jsx_runtime_1.jsx)(TTDDialogInput_1.TTDDialogInput, { input: text, placeholder: (0, i18n_1.t)("mermaid.inputPlaceholder"), onChange: (value) => setText(value), errorLine: errorLine, onKeyboardSubmit: () => {
                                onInsertToEditor();
                            } }) }), (0, jsx_runtime_1.jsx)(TTDDialogPanel_1.TTDDialogPanel, { panelActions: [
                            {
                                action: () => {
                                    onInsertToEditor();
                                },
                                label: (0, i18n_1.t)("mermaid.button"),
                                icon: icons_1.ArrowRightIcon,
                                variant: "button",
                            },
                        ], renderSubmitShortcut: () => (0, jsx_runtime_1.jsx)(TTDDialogSubmitShortcut_1.TTDDialogSubmitShortcut, {}), children: (0, jsx_runtime_1.jsx)(TTDDialogOutput_1.TTDDialogOutput, { canvasRef: canvasRef, loaded: mermaidToExcalidrawLib.loaded, error: error, sourceText: text, autoFixAvailable: !!autoFixCandidate, onApplyAutoFix: onApplyAutoFix }) })] })] }));
};
exports.default = MermaidToExcalidraw;
