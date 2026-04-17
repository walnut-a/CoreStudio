"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const view_1 = require("@codemirror/view");
const state_1 = require("@codemirror/state");
const commands_1 = require("@codemirror/commands");
const language_1 = require("@codemirror/language");
const highlight_1 = require("@lezer/highlight");
const mermaid_lang_lite_1 = require("./mermaid-lang-lite");
// ---- Dark theme ----
const darkTheme = view_1.EditorView.theme({
    "&": {
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4",
    },
    ".cm-content": { caretColor: "#fff" },
    ".cm-cursor": { borderLeftColor: "#fff" },
    ".cm-gutters": {
        backgroundColor: "#1e1e1e",
        color: "#858585",
        border: "none",
    },
    ".cm-activeLineGutter": { backgroundColor: "#2a2a2a" },
    ".cm-activeLine": { backgroundColor: "#2a2a2a" },
    ".cm-errorLine": { backgroundColor: "rgba(255, 0, 0, 0.15)" },
}, { dark: true });
const darkHighlight = language_1.HighlightStyle.define([
    { tag: highlight_1.tags.keyword, color: "#569cd6" },
    { tag: highlight_1.tags.string, color: "#ce9178" },
    { tag: highlight_1.tags.comment, color: "#6a9955" },
    { tag: highlight_1.tags.number, color: "#b5cea8" },
    { tag: highlight_1.tags.operator, color: "#d4d4d4" },
    { tag: highlight_1.tags.punctuation, color: "#d4d4d4" },
    { tag: highlight_1.tags.variableName, color: "#9cdcfe" },
    { tag: highlight_1.tags.bracket, color: "#ffd700" },
]);
// ---- Light theme ----
const lightTheme = view_1.EditorView.theme({
    "&": {
        backgroundColor: "#ffffff",
        color: "#1e1e1e",
    },
    ".cm-content": { caretColor: "#000" },
    ".cm-cursor": { borderLeftColor: "#000" },
    ".cm-gutters": {
        backgroundColor: "#fff",
        color: "#999",
        border: "none",
    },
    ".cm-activeLineGutter": { backgroundColor: "#e8e8e8" },
    ".cm-activeLine": { backgroundColor: "#e8e8e8" },
    ".cm-errorLine": { backgroundColor: "rgba(255, 0, 0, 0.1)" },
});
const lightHighlight = language_1.HighlightStyle.define([
    { tag: highlight_1.tags.keyword, color: "#0000ff" },
    { tag: highlight_1.tags.string, color: "#a31515" },
    { tag: highlight_1.tags.comment, color: "#008000" },
    { tag: highlight_1.tags.number, color: "#098658" },
    { tag: highlight_1.tags.operator, color: "#1e1e1e" },
    { tag: highlight_1.tags.punctuation, color: "#1e1e1e" },
    { tag: highlight_1.tags.variableName, color: "#001080" },
    { tag: highlight_1.tags.bracket, color: "#af00db" },
]);
// ---- Error line decoration ----
const errorLineDeco = view_1.Decoration.line({ class: "cm-errorLine" });
const getErrorLineExtension = (errorLine, doc) => {
    if (!errorLine || errorLine < 1 || errorLine > doc.lines) {
        return view_1.EditorView.decorations.of(view_1.Decoration.none);
    }
    const line = doc.line(errorLine);
    return view_1.EditorView.decorations.of(view_1.Decoration.set([errorLineDeco.range(line.from)]));
};
// ---- Helpers ----
const getThemeExtensions = (theme) => {
    if (theme === "dark") {
        return [darkTheme, (0, language_1.syntaxHighlighting)(darkHighlight)];
    }
    return [lightTheme, (0, language_1.syntaxHighlighting)(lightHighlight)];
};
const CodeMirrorEditor = ({ value, onChange, onKeyboardSubmit, placeholder, theme, errorLine, }) => {
    const containerRef = (0, react_1.useRef)(null);
    const viewRef = (0, react_1.useRef)(null);
    const onChangeRef = (0, react_1.useRef)(onChange);
    const onKeyboardSubmitRef = (0, react_1.useRef)(onKeyboardSubmit);
    const themeCompartmentRef = (0, react_1.useRef)(new state_1.Compartment());
    const errorLineCompartmentRef = (0, react_1.useRef)(new state_1.Compartment());
    onChangeRef.current = onChange;
    onKeyboardSubmitRef.current = onKeyboardSubmit;
    (0, react_1.useEffect)(() => {
        if (!containerRef.current) {
            return;
        }
        const themeCompartment = themeCompartmentRef.current;
        const view = new view_1.EditorView({
            state: state_1.EditorState.create({
                doc: value,
                extensions: [
                    view_1.keymap.of([
                        {
                            key: "Mod-Enter",
                            run: () => {
                                onKeyboardSubmitRef.current?.();
                                return true;
                            },
                        },
                        // historyKeymap binds Mod-Shift-z only on Mac; add it for all platforms
                        { key: "Mod-Shift-z", run: commands_1.redo, preventDefault: true },
                    ]),
                    view_1.EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            onChangeRef.current(update.state.doc.toString());
                        }
                    }),
                    (0, commands_1.history)(),
                    view_1.keymap.of([...commands_1.defaultKeymap, ...commands_1.historyKeymap]),
                    (0, view_1.lineNumbers)(),
                    view_1.EditorView.lineWrapping,
                    themeCompartment.of(getThemeExtensions(theme)),
                    errorLineCompartmentRef.current.of([]),
                    (0, mermaid_lang_lite_1.mermaidLite)(),
                    (0, view_1.drawSelection)({ drawRangeCursor: true }),
                    ...(placeholder ? [(0, view_1.placeholder)(placeholder)] : []),
                ],
            }),
            parent: containerRef.current,
        });
        viewRef.current = view;
        view.focus();
        return () => {
            view.destroy();
            viewRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Swap theme dynamically via compartment
    (0, react_1.useEffect)(() => {
        const view = viewRef.current;
        if (!view) {
            return;
        }
        view.dispatch({
            effects: themeCompartmentRef.current.reconfigure(getThemeExtensions(theme)),
        });
    }, [theme]);
    // Update error line highlight
    (0, react_1.useEffect)(() => {
        const view = viewRef.current;
        if (!view) {
            return;
        }
        view.dispatch({
            effects: errorLineCompartmentRef.current.reconfigure(getErrorLineExtension(errorLine, view.state.doc)),
        });
    }, [errorLine]);
    // Sync external value changes into EditorView
    (0, react_1.useEffect)(() => {
        const view = viewRef.current;
        if (!view) {
            return;
        }
        const currentDoc = view.state.doc.toString();
        if (value !== currentDoc) {
            view.dispatch({
                changes: { from: 0, to: currentDoc.length, insert: value },
            });
        }
    }, [value]);
    return ((0, jsx_runtime_1.jsx)("div", { ref: containerRef, className: "ttd-dialog-input ttd-dialog-input--codemirror" }));
};
exports.default = CodeMirrorEditor;
