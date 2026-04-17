"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpDialog = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const common_1 = require("@excalidraw/common");
const common_2 = require("@excalidraw/common");
const shortcuts_1 = require("../actions/shortcuts");
const clipboard_1 = require("../clipboard");
const i18n_1 = require("../i18n");
const shortcut_1 = require("../shortcut");
const Dialog_1 = require("./Dialog");
const icons_1 = require("./icons");
require("./HelpDialog.scss");
const Header = () => ((0, jsx_runtime_1.jsxs)("div", { className: "HelpDialog__header", children: [(0, jsx_runtime_1.jsxs)("a", { className: "HelpDialog__btn", href: "https://docs.excalidraw.com", target: "_blank", rel: "noopener", children: [(0, jsx_runtime_1.jsx)("div", { className: "HelpDialog__link-icon", children: icons_1.ExternalLinkIcon }), (0, i18n_1.t)("helpDialog.documentation")] }), (0, jsx_runtime_1.jsxs)("a", { className: "HelpDialog__btn", href: "https://plus.excalidraw.com/blog", target: "_blank", rel: "noopener", children: [(0, jsx_runtime_1.jsx)("div", { className: "HelpDialog__link-icon", children: icons_1.ExternalLinkIcon }), (0, i18n_1.t)("helpDialog.blog")] }), (0, jsx_runtime_1.jsxs)("a", { className: "HelpDialog__btn", href: "https://github.com/excalidraw/excalidraw/issues", target: "_blank", rel: "noopener noreferrer", children: [(0, jsx_runtime_1.jsx)("div", { className: "HelpDialog__link-icon", children: icons_1.GithubIcon }), (0, i18n_1.t)("helpDialog.github")] }), (0, jsx_runtime_1.jsxs)("a", { className: "HelpDialog__btn", href: "https://youtube.com/@excalidraw", target: "_blank", rel: "noopener noreferrer", children: [(0, jsx_runtime_1.jsx)("div", { className: "HelpDialog__link-icon", children: icons_1.youtubeIcon }), "YouTube"] })] }));
const Section = (props) => ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h3", { children: props.title }), (0, jsx_runtime_1.jsx)("div", { className: "HelpDialog__islands-container", children: props.children })] }));
const ShortcutIsland = (props) => ((0, jsx_runtime_1.jsxs)("div", { className: `HelpDialog__island ${props.className}`, children: [(0, jsx_runtime_1.jsx)("h4", { className: "HelpDialog__island-title", children: props.caption }), (0, jsx_runtime_1.jsx)("div", { className: "HelpDialog__island-content", children: props.children })] }));
function* intersperse(as, delim) {
    let first = true;
    for (const x of as) {
        if (!first) {
            yield delim;
        }
        first = false;
        yield x;
    }
}
const upperCaseSingleChars = (str) => {
    return str.replace(/\b[a-z]\b/, (c) => c.toUpperCase());
};
const Shortcut = ({ label, shortcuts, isOr = true, }) => {
    const splitShortcutKeys = shortcuts.map((shortcut) => {
        const keys = shortcut.endsWith("++")
            ? [...shortcut.slice(0, -2).split("+"), "+"]
            : shortcut.split("+");
        return keys.map((key) => ((0, jsx_runtime_1.jsx)(ShortcutKey, { children: upperCaseSingleChars(key) }, key)));
    });
    return ((0, jsx_runtime_1.jsxs)("div", { className: "HelpDialog__shortcut", children: [(0, jsx_runtime_1.jsx)("div", { children: label }), (0, jsx_runtime_1.jsx)("div", { className: "HelpDialog__key-container", children: [...intersperse(splitShortcutKeys, isOr ? (0, i18n_1.t)("helpDialog.or") : null)] })] }));
};
const ShortcutKey = (props) => ((0, jsx_runtime_1.jsx)("kbd", { className: "HelpDialog__key", ...props }));
const HelpDialog = ({ onClose }) => {
    const handleClose = react_1.default.useCallback(() => {
        if (onClose) {
            onClose();
        }
    }, [onClose]);
    return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsxs)(Dialog_1.Dialog, { onCloseRequest: handleClose, title: (0, i18n_1.t)("helpDialog.title"), className: "HelpDialog", children: [(0, jsx_runtime_1.jsx)(Header, {}), (0, jsx_runtime_1.jsxs)(Section, { title: (0, i18n_1.t)("helpDialog.shortcuts"), children: [(0, jsx_runtime_1.jsxs)(ShortcutIsland, { className: "HelpDialog__island--tools", caption: (0, i18n_1.t)("helpDialog.tools"), children: [(0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.hand"), shortcuts: [common_2.KEYS.H] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.selection"), shortcuts: [common_2.KEYS.V, common_2.KEYS["1"]] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.rectangle"), shortcuts: [common_2.KEYS.R, common_2.KEYS["2"]] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.diamond"), shortcuts: [common_2.KEYS.D, common_2.KEYS["3"]] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.ellipse"), shortcuts: [common_2.KEYS.O, common_2.KEYS["4"]] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.arrow"), shortcuts: [common_2.KEYS.A, common_2.KEYS["5"]] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.line"), shortcuts: [common_2.KEYS.L, common_2.KEYS["6"]] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.freedraw"), shortcuts: [common_2.KEYS.P, common_2.KEYS["7"]] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.text"), shortcuts: [common_2.KEYS.T, common_2.KEYS["8"]] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.image"), shortcuts: [common_2.KEYS["9"]] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.eraser"), shortcuts: [common_2.KEYS.E, common_2.KEYS["0"]] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.frame"), shortcuts: [common_2.KEYS.F] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.laser"), shortcuts: [common_2.KEYS.K] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.eyeDropper"), shortcuts: [common_2.KEYS.I, "Shift+S", "Shift+G"] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.editLineArrowPoints"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Enter")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.editText"), shortcuts: [(0, shortcut_1.getShortcutKey)("Enter")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.textNewLine"), shortcuts: [
                                        (0, shortcut_1.getShortcutKey)("Enter"),
                                        (0, shortcut_1.getShortcutKey)("Shift+Enter"),
                                    ] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.textFinish"), shortcuts: [
                                        (0, shortcut_1.getShortcutKey)("Esc"),
                                        (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Enter"),
                                    ] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.curvedArrow"), shortcuts: [
                                        "A",
                                        (0, i18n_1.t)("helpDialog.click"),
                                        (0, i18n_1.t)("helpDialog.click"),
                                        (0, i18n_1.t)("helpDialog.click"),
                                    ], isOr: false }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.curvedLine"), shortcuts: [
                                        "L",
                                        (0, i18n_1.t)("helpDialog.click"),
                                        (0, i18n_1.t)("helpDialog.click"),
                                        (0, i18n_1.t)("helpDialog.click"),
                                    ], isOr: false }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.cropStart"), shortcuts: [(0, i18n_1.t)("helpDialog.doubleClick"), (0, shortcut_1.getShortcutKey)("Enter")], isOr: true }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.cropFinish"), shortcuts: [(0, shortcut_1.getShortcutKey)("Enter"), (0, shortcut_1.getShortcutKey)("Escape")], isOr: true }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.lock"), shortcuts: [common_2.KEYS.Q] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.preventBinding"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.link"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+K")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("toolBar.convertElementType"), shortcuts: ["Tab", "Shift+Tab"], isOr: true })] }), (0, jsx_runtime_1.jsxs)(ShortcutIsland, { className: "HelpDialog__island--view", caption: (0, i18n_1.t)("helpDialog.view"), children: [(0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("buttons.zoomIn"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd++")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("buttons.zoomOut"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+-")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("buttons.resetZoom"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+0")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.zoomToFit"), shortcuts: ["Shift+1"] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.zoomToSelection"), shortcuts: ["Shift+2"] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.movePageUpDown"), shortcuts: ["PgUp/PgDn"] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.movePageLeftRight"), shortcuts: ["Shift+PgUp/PgDn"] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("buttons.zenMode"), shortcuts: [(0, shortcut_1.getShortcutKey)("Alt+Z")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("buttons.objectsSnapMode"), shortcuts: [(0, shortcut_1.getShortcutKey)("Alt+S")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.toggleGrid"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+'")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.viewMode"), shortcuts: [(0, shortcut_1.getShortcutKey)("Alt+R")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.toggleTheme"), shortcuts: [(0, shortcut_1.getShortcutKey)("Alt+Shift+D")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("stats.fullTitle"), shortcuts: [(0, shortcut_1.getShortcutKey)("Alt+/")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("search.title"), shortcuts: [(0, shortcuts_1.getShortcutFromShortcutName)("searchMenu")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("commandPalette.title"), shortcuts: common_1.isFirefox
                                        ? [(0, shortcuts_1.getShortcutFromShortcutName)("commandPalette")]
                                        : [
                                            (0, shortcuts_1.getShortcutFromShortcutName)("commandPalette"),
                                            (0, shortcuts_1.getShortcutFromShortcutName)("commandPalette", 1),
                                        ] })] }), (0, jsx_runtime_1.jsxs)(ShortcutIsland, { className: "HelpDialog__island--editor", caption: (0, i18n_1.t)("helpDialog.editor"), children: [(0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.createFlowchart"), shortcuts: [(0, shortcut_1.getShortcutKey)(`CtrlOrCmd+Arrow Key`)], isOr: true }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.navigateFlowchart"), shortcuts: [(0, shortcut_1.getShortcutKey)(`Alt+Arrow Key`)], isOr: true }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.moveCanvas"), shortcuts: [
                                        (0, shortcut_1.getShortcutKey)(`Space+${(0, i18n_1.t)("helpDialog.drag")}`),
                                        (0, shortcut_1.getShortcutKey)(`Wheel+${(0, i18n_1.t)("helpDialog.drag")}`),
                                    ], isOr: true }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("buttons.clearReset"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Delete")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.delete"), shortcuts: [(0, shortcut_1.getShortcutKey)("Delete")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.cut"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+X")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.copy"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+C")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.paste"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+V")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.pasteAsPlaintext"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+V")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.selectAll"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+A")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.multiSelect"), shortcuts: [(0, shortcut_1.getShortcutKey)(`Shift+${(0, i18n_1.t)("helpDialog.click")}`)] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.deepSelect"), shortcuts: [(0, shortcut_1.getShortcutKey)(`CtrlOrCmd+${(0, i18n_1.t)("helpDialog.click")}`)] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.deepBoxSelect"), shortcuts: [(0, shortcut_1.getShortcutKey)(`CtrlOrCmd+${(0, i18n_1.t)("helpDialog.drag")}`)] }), (clipboard_1.probablySupportsClipboardBlob || common_1.isFirefox) && ((0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.copyAsPng"), shortcuts: [(0, shortcut_1.getShortcutKey)("Shift+Alt+C")] })), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.copyStyles"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Alt+C")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.pasteStyles"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Alt+V")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.sendToBack"), shortcuts: [
                                        common_1.isDarwin
                                            ? (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Alt+[")
                                            : (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+["),
                                    ] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.bringToFront"), shortcuts: [
                                        common_1.isDarwin
                                            ? (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Alt+]")
                                            : (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+]"),
                                    ] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.sendBackward"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+[")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.bringForward"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+]")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.alignTop"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+Up")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.alignBottom"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+Down")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.alignLeft"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+Left")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.alignRight"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+Right")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.duplicateSelection"), shortcuts: [
                                        (0, shortcut_1.getShortcutKey)("CtrlOrCmd+D"),
                                        (0, shortcut_1.getShortcutKey)(`Alt+${(0, i18n_1.t)("helpDialog.drag")}`),
                                    ] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("helpDialog.toggleElementLock"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+L")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("buttons.undo"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Z")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("buttons.redo"), shortcuts: common_1.isWindows
                                        ? [
                                            (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Y"),
                                            (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+Z"),
                                        ]
                                        : [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+Z")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.group"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+G")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.ungroup"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+G")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.flipHorizontal"), shortcuts: [(0, shortcut_1.getShortcutKey)("Shift+H")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.flipVertical"), shortcuts: [(0, shortcut_1.getShortcutKey)("Shift+V")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.showStroke"), shortcuts: [(0, shortcut_1.getShortcutKey)("S")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.showBackground"), shortcuts: [(0, shortcut_1.getShortcutKey)("G")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.showFonts"), shortcuts: [(0, shortcut_1.getShortcutKey)("Shift+F")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.decreaseFontSize"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+<")] }), (0, jsx_runtime_1.jsx)(Shortcut, { label: (0, i18n_1.t)("labels.increaseFontSize"), shortcuts: [(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+>")] })] })] })] }) }));
};
exports.HelpDialog = HelpDialog;
