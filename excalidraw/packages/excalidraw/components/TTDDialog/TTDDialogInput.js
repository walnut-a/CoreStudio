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
exports.TTDDialogInput = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const Spinner_1 = __importDefault(require("../Spinner"));
const ui_appState_1 = require("../../context/ui-appState");
const SPINNER_DELAY_MS = 300;
const TTDDialogInput = ({ input, placeholder, onChange, onKeyboardSubmit, errorLine, }) => {
    const ref = (0, react_1.useRef)(null);
    const callbackRef = (0, react_1.useRef)(onKeyboardSubmit);
    callbackRef.current = onKeyboardSubmit;
    const [editorState, setEditorState] = (0, react_1.useState)({
        type: "loading",
    });
    const [showSpinner, setShowSpinner] = (0, react_1.useState)(false);
    const { theme } = (0, ui_appState_1.useUIAppState)();
    // Lazy-load CodeMirror editor
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        const spinnerTimer = setTimeout(() => {
            if (!cancelled) {
                setShowSpinner(true);
            }
        }, SPINNER_DELAY_MS);
        Promise.resolve().then(() => __importStar(require("./CodeMirrorEditor"))).then((mod) => {
            if (!cancelled) {
                setEditorState({ type: "ready", component: mod.default });
            }
        })
            .catch(() => {
            if (!cancelled) {
                setEditorState({ type: "fallback" });
            }
        })
            .finally(() => {
            clearTimeout(spinnerTimer);
        });
        return () => {
            cancelled = true;
            clearTimeout(spinnerTimer);
        };
    }, []);
    // Keyboard shortcut + focus for textarea fallback
    (0, react_1.useEffect)(() => {
        if (editorState.type !== "fallback") {
            return;
        }
        if (!callbackRef.current) {
            return;
        }
        const textarea = ref.current;
        if (textarea) {
            const handleKeyDown = (event) => {
                if (event[common_1.KEYS.CTRL_OR_CMD] && event.key === common_1.KEYS.ENTER) {
                    event.preventDefault();
                    callbackRef.current?.();
                }
            };
            textarea.focus();
            textarea.addEventListener(common_1.EVENT.KEYDOWN, handleKeyDown);
            return () => {
                textarea.removeEventListener(common_1.EVENT.KEYDOWN, handleKeyDown);
            };
        }
    }, [editorState.type]);
    if (editorState.type === "ready") {
        const CodeMirrorEditor = editorState.component;
        return ((0, jsx_runtime_1.jsx)(CodeMirrorEditor, { value: input, onChange: onChange, onKeyboardSubmit: onKeyboardSubmit, placeholder: placeholder, theme: theme, errorLine: errorLine }));
    }
    if (editorState.type === "fallback") {
        return ((0, jsx_runtime_1.jsx)("textarea", { className: "ttd-dialog-input", onChange: (e) => onChange(e.target.value), value: input, placeholder: placeholder, ref: ref }));
    }
    // Loading state
    if (showSpinner) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "ttd-dialog-input ttd-dialog-input--loading", children: (0, jsx_runtime_1.jsx)(Spinner_1.default, {}) }));
    }
    return null;
};
exports.TTDDialogInput = TTDDialogInput;
