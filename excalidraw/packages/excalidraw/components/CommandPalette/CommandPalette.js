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
exports.CommandPalette = exports.DEFAULT_CATEGORIES = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const fuzzy_1 = __importDefault(require("fuzzy"));
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const actionToggleShapeSwitch_1 = require("../../actions/actionToggleShapeSwitch");
const shortcut_1 = require("../../shortcut");
const actions_1 = require("../../actions");
const actionElementLink_1 = require("../../actions/actionElementLink");
const shortcuts_1 = require("../../actions/shortcuts");
const analytics_1 = require("../../analytics");
const ui_appState_1 = require("../../context/ui-appState");
const deburr_1 = require("../../deburr");
const editor_jotai_1 = require("../../editor-jotai");
const i18n_1 = require("../../i18n");
const App_1 = require("../App");
const Dialog_1 = require("../Dialog");
const InlineIcon_1 = require("../InlineIcon");
const TextField_1 = require("../TextField");
const scene_1 = require("../../scene");
const icons_1 = require("../icons");
const shapes_1 = require("../shapes");
const Actions_1 = require("../Actions");
const useStableCallback_1 = require("../../hooks/useStableCallback");
const ActiveConfirmDialog_1 = require("../ActiveConfirmDialog");
const useStable_1 = require("../../hooks/useStable");
const Ellipsify_1 = require("../Ellipsify");
const library_1 = require("../../data/library");
const useLibraryItemSvg_1 = require("../../hooks/useLibraryItemSvg");
const defaultItems = __importStar(require("./defaultCommandPaletteItems"));
require("./CommandPalette.scss");
const lastUsedPaletteItem = (0, editor_jotai_1.atom)(null);
exports.DEFAULT_CATEGORIES = {
    app: "App",
    export: "Export",
    tools: "Tools",
    editor: "Editor",
    elements: "Elements",
    links: "Links",
    library: "Library",
};
const getCategoryOrder = (category) => {
    switch (category) {
        case exports.DEFAULT_CATEGORIES.app:
            return 1;
        case exports.DEFAULT_CATEGORIES.export:
            return 2;
        case exports.DEFAULT_CATEGORIES.editor:
            return 3;
        case exports.DEFAULT_CATEGORIES.tools:
            return 4;
        case exports.DEFAULT_CATEGORIES.elements:
            return 5;
        case exports.DEFAULT_CATEGORIES.links:
            return 6;
        default:
            return 10;
    }
};
const CommandShortcutHint = ({ shortcut, className, children, }) => {
    const shortcuts = shortcut.replace("++", "+$").split("+");
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("shortcut", className), children: [shortcuts.map((item, idx) => {
                return ((0, jsx_runtime_1.jsx)("div", { className: "shortcut-wrapper", children: (0, jsx_runtime_1.jsx)("div", { className: "shortcut-key", children: item === "$" ? "+" : item }) }, item));
            }), (0, jsx_runtime_1.jsx)("div", { className: "shortcut-desc", children: children })] }));
};
const isCommandPaletteToggleShortcut = (event) => {
    return (!event.altKey &&
        event[common_1.KEYS.CTRL_OR_CMD] &&
        ((event.shiftKey && event.key.toLowerCase() === common_1.KEYS.P) ||
            event.key === common_1.KEYS.SLASH));
};
exports.CommandPalette = Object.assign((props) => {
    const uiAppState = (0, ui_appState_1.useUIAppState)();
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    (0, react_1.useEffect)(() => {
        const commandPaletteShortcut = (event) => {
            if (isCommandPaletteToggleShortcut(event)) {
                event.preventDefault();
                event.stopPropagation();
                setAppState((appState) => {
                    const nextState = appState.openDialog?.name === "commandPalette"
                        ? null
                        : { name: "commandPalette" };
                    if (nextState) {
                        (0, analytics_1.trackEvent)("command_palette", "open", "shortcut");
                    }
                    return {
                        openDialog: nextState,
                    };
                });
            }
        };
        window.addEventListener(common_1.EVENT.KEYDOWN, commandPaletteShortcut, {
            capture: true,
        });
        return () => window.removeEventListener(common_1.EVENT.KEYDOWN, commandPaletteShortcut, {
            capture: true,
        });
    }, [setAppState]);
    if (uiAppState.openDialog?.name !== "commandPalette") {
        return null;
    }
    return (0, jsx_runtime_1.jsx)(CommandPaletteInner, { ...props });
}, {
    defaultItems,
});
function CommandPaletteInner({ customCommandPaletteItems, }) {
    const app = (0, App_1.useApp)();
    const uiAppState = (0, ui_appState_1.useUIAppState)();
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const appProps = (0, App_1.useAppProps)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    const [lastUsed, setLastUsed] = (0, editor_jotai_1.useAtom)(lastUsedPaletteItem);
    const [allCommands, setAllCommands] = (0, react_1.useState)(null);
    const inputRef = (0, react_1.useRef)(null);
    const stableDeps = (0, useStable_1.useStable)({
        uiAppState,
        customCommandPaletteItems,
        appProps,
    });
    const [libraryItemsData] = (0, editor_jotai_1.useAtom)(library_1.libraryItemsAtom);
    const libraryCommands = (0, react_1.useMemo)(() => {
        return (libraryItemsData.libraryItems
            ?.filter((libraryItem) => !!libraryItem.name)
            .map((libraryItem) => ({
            label: libraryItem.name,
            icon: ((0, jsx_runtime_1.jsx)(LibraryItemIcon, { id: libraryItem.id, elements: libraryItem.elements })),
            category: "Library",
            order: getCategoryOrder("Library"),
            haystack: (0, deburr_1.deburr)(libraryItem.name),
            perform: () => {
                app.onInsertElements((0, library_1.distributeLibraryItemsOnSquareGrid)([libraryItem]));
            },
        })) || []);
    }, [app, libraryItemsData.libraryItems]);
    (0, react_1.useEffect)(() => {
        // these props change often and we don't want them to re-run the effect
        // which would renew `allCommands`, cascading down and resetting state.
        //
        // This means that the commands won't update on appState/appProps changes
        // while the command palette is open
        const { uiAppState, customCommandPaletteItems, appProps } = stableDeps;
        const getActionLabel = (action) => {
            let label = "";
            if (action.label) {
                if (typeof action.label === "function") {
                    label = (0, i18n_1.t)(action.label(app.scene.getNonDeletedElements(), uiAppState, app));
                }
                else {
                    label = (0, i18n_1.t)(action.label);
                }
            }
            return label;
        };
        const getActionIcon = (action) => {
            if (typeof action.icon === "function") {
                return action.icon(uiAppState, app.scene.getNonDeletedElements());
            }
            return action.icon;
        };
        let commandsFromActions = [];
        const actionToCommand = (action, category, transformer) => {
            const command = {
                label: getActionLabel(action),
                icon: getActionIcon(action),
                category,
                shortcut: (0, shortcuts_1.getShortcutFromShortcutName)(action.name),
                keywords: action.keywords,
                predicate: action.predicate,
                viewMode: action.viewMode,
                perform: () => {
                    actionManager.executeAction(action, "commandPalette");
                },
            };
            return transformer ? transformer(command, action) : command;
        };
        if (uiAppState && app.scene && actionManager) {
            const elementsCommands = [
                actionManager.actions.group,
                actionManager.actions.ungroup,
                actionManager.actions.cut,
                actionManager.actions.copy,
                actionManager.actions.deleteSelectedElements,
                actionManager.actions.wrapSelectionInFrame,
                actionManager.actions.copyStyles,
                actionManager.actions.pasteStyles,
                actionManager.actions.bringToFront,
                actionManager.actions.bringForward,
                actionManager.actions.sendBackward,
                actionManager.actions.sendToBack,
                actionManager.actions.alignTop,
                actionManager.actions.alignBottom,
                actionManager.actions.alignLeft,
                actionManager.actions.alignRight,
                actionManager.actions.alignVerticallyCentered,
                actionManager.actions.alignHorizontallyCentered,
                actionManager.actions.duplicateSelection,
                actionManager.actions.flipHorizontal,
                actionManager.actions.flipVertical,
                actionManager.actions.zoomToFitSelection,
                actionManager.actions.zoomToFitSelectionInViewport,
                actionManager.actions.increaseFontSize,
                actionManager.actions.decreaseFontSize,
                actionManager.actions.toggleLinearEditor,
                actionManager.actions.cropEditor,
                actionManager.actions.togglePolygon,
                actions_1.actionLink,
                actionElementLink_1.actionCopyElementLink,
                actionElementLink_1.actionLinkToElement,
            ].map((action) => actionToCommand(action, exports.DEFAULT_CATEGORIES.elements, (command, action) => ({
                ...command,
                predicate: action.predicate
                    ? action.predicate
                    : (elements, appState, appProps, app) => {
                        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
                        return selectedElements.length > 0;
                    },
            })));
            const toolCommands = [
                actionManager.actions.toggleHandTool,
                actionManager.actions.setFrameAsActiveTool,
                actionManager.actions.toggleLassoTool,
            ].map((action) => actionToCommand(action, exports.DEFAULT_CATEGORIES.tools));
            const editorCommands = [
                actionManager.actions.undo,
                actionManager.actions.redo,
                actionManager.actions.zoomIn,
                actionManager.actions.zoomOut,
                actionManager.actions.resetZoom,
                actionManager.actions.zoomToFit,
                actionManager.actions.zenMode,
                actionManager.actions.viewMode,
                actionManager.actions.gridMode,
                actionManager.actions.objectsSnapMode,
                actionManager.actions.toggleShortcuts,
                actionManager.actions.selectAll,
                actionManager.actions.toggleElementLock,
                actionManager.actions.unlockAllElements,
                actionManager.actions.stats,
            ].map((action) => actionToCommand(action, exports.DEFAULT_CATEGORIES.editor));
            const exportCommands = [
                actionManager.actions.saveToActiveFile,
                actionManager.actions.saveFileToDisk,
                actionManager.actions.copyAsPng,
                actionManager.actions.copyAsSvg,
            ].map((action) => actionToCommand(action, exports.DEFAULT_CATEGORIES.export));
            commandsFromActions = [
                ...elementsCommands,
                ...editorCommands,
                {
                    label: getActionLabel(actions_1.actionClearCanvas),
                    icon: getActionIcon(actions_1.actionClearCanvas),
                    shortcut: (0, shortcuts_1.getShortcutFromShortcutName)(actions_1.actionClearCanvas.name),
                    category: exports.DEFAULT_CATEGORIES.editor,
                    keywords: ["delete", "destroy"],
                    viewMode: false,
                    perform: () => {
                        editor_jotai_1.editorJotaiStore.set(ActiveConfirmDialog_1.activeConfirmDialogAtom, "clearCanvas");
                    },
                },
                {
                    label: (0, i18n_1.t)("buttons.exportImage"),
                    category: exports.DEFAULT_CATEGORIES.export,
                    icon: icons_1.ExportImageIcon,
                    shortcut: (0, shortcuts_1.getShortcutFromShortcutName)("imageExport"),
                    keywords: [
                        "export",
                        "image",
                        "png",
                        "jpeg",
                        "svg",
                        "clipboard",
                        "picture",
                    ],
                    perform: () => {
                        setAppState({ openDialog: { name: "imageExport" } });
                    },
                },
                ...exportCommands,
            ];
            const additionalCommands = [
                {
                    label: (0, i18n_1.t)("toolBar.library"),
                    category: exports.DEFAULT_CATEGORIES.app,
                    icon: icons_1.LibraryIcon,
                    viewMode: false,
                    perform: () => {
                        if (uiAppState.openSidebar) {
                            setAppState({
                                openSidebar: null,
                            });
                        }
                        else {
                            setAppState({
                                openSidebar: {
                                    name: common_1.DEFAULT_SIDEBAR.name,
                                    tab: common_1.DEFAULT_SIDEBAR.defaultTab,
                                },
                            });
                        }
                    },
                },
                {
                    label: (0, i18n_1.t)("search.title"),
                    category: exports.DEFAULT_CATEGORIES.app,
                    icon: icons_1.searchIcon,
                    viewMode: true,
                    perform: () => {
                        actionManager.executeAction(actions_1.actionToggleSearchMenu);
                    },
                },
                {
                    label: (0, i18n_1.t)("labels.shapeSwitch"),
                    category: exports.DEFAULT_CATEGORIES.elements,
                    icon: icons_1.boltIcon,
                    perform: () => {
                        actionManager.executeAction(actionToggleShapeSwitch_1.actionToggleShapeSwitch);
                    },
                },
                {
                    label: (0, i18n_1.t)("labels.changeStroke"),
                    keywords: ["color", "outline"],
                    category: exports.DEFAULT_CATEGORIES.elements,
                    icon: icons_1.bucketFillIcon,
                    viewMode: false,
                    predicate: (elements, appState) => {
                        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
                        return (selectedElements.length > 0 &&
                            (0, Actions_1.canChangeStrokeColor)(appState, selectedElements));
                    },
                    perform: () => {
                        setAppState((prevState) => ({
                            openPopup: "elementStroke",
                        }));
                    },
                },
                {
                    label: (0, i18n_1.t)("labels.changeBackground"),
                    keywords: ["color", "fill"],
                    icon: icons_1.bucketFillIcon,
                    category: exports.DEFAULT_CATEGORIES.elements,
                    viewMode: false,
                    predicate: (elements, appState) => {
                        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
                        return (selectedElements.length > 0 &&
                            (0, Actions_1.canChangeBackgroundColor)(appState, selectedElements));
                    },
                    perform: () => {
                        setAppState((prevState) => ({
                            openPopup: "elementBackground",
                        }));
                    },
                },
                {
                    label: (0, i18n_1.t)("labels.canvasBackground"),
                    keywords: ["color"],
                    icon: icons_1.bucketFillIcon,
                    category: exports.DEFAULT_CATEGORIES.editor,
                    viewMode: false,
                    perform: () => {
                        setAppState((prevState) => ({
                            openMenu: prevState.openMenu === "canvas" ? null : "canvas",
                            openPopup: "canvasBackground",
                        }));
                    },
                },
                ...shapes_1.SHAPES.reduce((acc, shape) => {
                    const { value, icon, key, numericKey } = shape;
                    if (appProps.UIOptions.tools?.[value] === false) {
                        return acc;
                    }
                    const letter = key && (0, common_1.capitalizeString)(typeof key === "string" ? key : key[0]);
                    const shortcut = letter || numericKey;
                    const command = {
                        label: (0, i18n_1.t)(`toolBar.${value}`),
                        category: exports.DEFAULT_CATEGORIES.tools,
                        shortcut,
                        icon,
                        keywords: ["toolbar"],
                        viewMode: false,
                        perform: ({ event }) => {
                            if (value === "image") {
                                app.setActiveTool({
                                    type: value,
                                });
                            }
                            else {
                                app.setActiveTool({ type: value });
                            }
                        },
                    };
                    acc.push(command);
                    return acc;
                }, []),
                ...toolCommands,
                {
                    label: (0, i18n_1.t)("toolBar.lock"),
                    category: exports.DEFAULT_CATEGORIES.tools,
                    icon: uiAppState.activeTool.locked ? icons_1.LockedIcon : icons_1.UnlockedIcon,
                    shortcut: common_1.KEYS.Q.toLocaleUpperCase(),
                    viewMode: false,
                    perform: () => {
                        app.toggleLock();
                    },
                },
                {
                    label: `${(0, i18n_1.t)("labels.textToDiagram")}...`,
                    category: exports.DEFAULT_CATEGORIES.tools,
                    icon: icons_1.brainIconThin,
                    viewMode: false,
                    predicate: appProps.aiEnabled,
                    perform: () => {
                        setAppState((state) => ({
                            ...state,
                            openDialog: {
                                name: "ttd",
                                tab: "text-to-diagram",
                            },
                        }));
                    },
                },
                {
                    label: `${(0, i18n_1.t)("toolBar.mermaidToExcalidraw")}...`,
                    category: exports.DEFAULT_CATEGORIES.tools,
                    icon: icons_1.mermaidLogoIcon,
                    viewMode: false,
                    predicate: appProps.aiEnabled,
                    perform: () => {
                        setAppState((state) => ({
                            ...state,
                            openDialog: {
                                name: "ttd",
                                tab: "mermaid",
                            },
                        }));
                    },
                },
                // {
                //   label: `${t("toolBar.magicframe")}...`,
                //   category: DEFAULT_CATEGORIES.tools,
                //   icon: MagicIconThin,
                //   viewMode: false,
                //   predicate: appProps.aiEnabled,
                //   perform: () => {
                //     app.onMagicframeToolSelect();
                //   },
                // },
            ];
            const allCommands = [
                ...commandsFromActions,
                ...additionalCommands,
                ...(customCommandPaletteItems || []),
            ].map((command) => {
                return {
                    ...command,
                    icon: command.icon || icons_1.boltIcon,
                    order: command.order ?? getCategoryOrder(command.category),
                    haystack: `${(0, deburr_1.deburr)(command.label.toLocaleLowerCase())} ${command.keywords?.join(" ") || ""}`,
                };
            });
            setAllCommands(allCommands);
            setLastUsed([...allCommands, ...libraryCommands].find((command) => command.label === lastUsed?.label) ?? null);
        }
    }, [
        stableDeps,
        app,
        actionManager,
        setAllCommands,
        lastUsed?.label,
        setLastUsed,
        setAppState,
        libraryCommands,
    ]);
    const [commandSearch, setCommandSearch] = (0, react_1.useState)("");
    const [currentCommand, setCurrentCommand] = (0, react_1.useState)(null);
    const [commandsByCategory, setCommandsByCategory] = (0, react_1.useState)({});
    const closeCommandPalette = (cb) => {
        setAppState({
            openDialog: null,
        }, cb);
        setCommandSearch("");
    };
    const executeCommand = (command, event) => {
        if (uiAppState.openDialog?.name === "commandPalette") {
            event.stopPropagation();
            event.preventDefault();
            document.body.classList.add("excalidraw-animations-disabled");
            closeCommandPalette(() => {
                command.perform({ actionManager, event });
                setLastUsed(command);
                requestAnimationFrame(() => {
                    document.body.classList.remove("excalidraw-animations-disabled");
                });
            });
        }
    };
    const isCommandAvailable = (0, useStableCallback_1.useStableCallback)((command) => {
        if (command.viewMode === false && uiAppState.viewModeEnabled) {
            return false;
        }
        return typeof command.predicate === "function"
            ? command.predicate(app.scene.getNonDeletedElements(), uiAppState, appProps, app)
            : command.predicate === undefined || command.predicate;
    });
    const handleKeyDown = (0, useStableCallback_1.useStableCallback)((event) => {
        const ignoreAlphanumerics = (0, common_1.isWritableElement)(event.target) ||
            isCommandPaletteToggleShortcut(event) ||
            event.key === common_1.KEYS.ESCAPE;
        if (ignoreAlphanumerics &&
            event.key !== common_1.KEYS.ARROW_UP &&
            event.key !== common_1.KEYS.ARROW_DOWN &&
            event.key !== common_1.KEYS.ENTER) {
            return;
        }
        const matchingCommands = Object.values(commandsByCategory).flat();
        const shouldConsiderLastUsed = lastUsed && !commandSearch && isCommandAvailable(lastUsed);
        if (event.key === common_1.KEYS.ARROW_UP) {
            event.preventDefault();
            const index = matchingCommands.findIndex((item) => item.label === currentCommand?.label);
            if (shouldConsiderLastUsed) {
                if (index === 0) {
                    setCurrentCommand(lastUsed);
                    return;
                }
                if (currentCommand === lastUsed) {
                    const nextItem = matchingCommands[matchingCommands.length - 1];
                    if (nextItem) {
                        setCurrentCommand(nextItem);
                    }
                    return;
                }
            }
            let nextIndex;
            if (index === -1) {
                nextIndex = matchingCommands.length - 1;
            }
            else {
                nextIndex =
                    index === 0
                        ? matchingCommands.length - 1
                        : (index - 1) % matchingCommands.length;
            }
            const nextItem = matchingCommands[nextIndex];
            if (nextItem) {
                setCurrentCommand(nextItem);
            }
            return;
        }
        if (event.key === common_1.KEYS.ARROW_DOWN) {
            event.preventDefault();
            const index = matchingCommands.findIndex((item) => item.label === currentCommand?.label);
            if (shouldConsiderLastUsed) {
                if (!currentCommand || index === matchingCommands.length - 1) {
                    setCurrentCommand(lastUsed);
                    return;
                }
                if (currentCommand === lastUsed) {
                    const nextItem = matchingCommands[0];
                    if (nextItem) {
                        setCurrentCommand(nextItem);
                    }
                    return;
                }
            }
            const nextIndex = (index + 1) % matchingCommands.length;
            const nextItem = matchingCommands[nextIndex];
            if (nextItem) {
                setCurrentCommand(nextItem);
            }
            return;
        }
        if (event.key === common_1.KEYS.ENTER) {
            if (currentCommand) {
                setTimeout(() => {
                    executeCommand(currentCommand, event);
                });
            }
        }
        if (ignoreAlphanumerics) {
            return;
        }
        // prevent regular editor shortcuts
        event.stopPropagation();
        // if alphanumeric keypress and we're not inside the input, focus it
        if (/^[a-zA-Z0-9]$/.test(event.key)) {
            inputRef?.current?.focus();
            return;
        }
        event.preventDefault();
    });
    (0, react_1.useEffect)(() => {
        window.addEventListener(common_1.EVENT.KEYDOWN, handleKeyDown, {
            capture: true,
        });
        return () => window.removeEventListener(common_1.EVENT.KEYDOWN, handleKeyDown, {
            capture: true,
        });
    }, [handleKeyDown]);
    (0, react_1.useEffect)(() => {
        if (!allCommands) {
            return;
        }
        const getNextCommandsByCategory = (commands) => {
            const nextCommandsByCategory = {};
            for (const command of commands) {
                if (nextCommandsByCategory[command.category]) {
                    nextCommandsByCategory[command.category].push(command);
                }
                else {
                    nextCommandsByCategory[command.category] = [command];
                }
            }
            return nextCommandsByCategory;
        };
        let matchingCommands = commandSearch?.length > 1
            ? [
                ...allCommands
                    .filter(isCommandAvailable)
                    .sort((a, b) => a.order - b.order),
                ...libraryCommands,
            ]
            : allCommands
                .filter(isCommandAvailable)
                .sort((a, b) => a.order - b.order);
        const showLastUsed = !commandSearch && lastUsed && isCommandAvailable(lastUsed);
        if (!commandSearch) {
            setCommandsByCategory(getNextCommandsByCategory(showLastUsed
                ? matchingCommands.filter((command) => command.label !== lastUsed?.label)
                : matchingCommands));
            setCurrentCommand(showLastUsed ? lastUsed : matchingCommands[0] || null);
            return;
        }
        const _query = (0, deburr_1.deburr)(commandSearch.toLocaleLowerCase().replace(/[<>_| -]/g, ""));
        matchingCommands = fuzzy_1.default
            .filter(_query, matchingCommands, {
            extract: (command) => command.haystack ?? "",
        })
            .sort((a, b) => b.score - a.score)
            .map((item) => item.original);
        setCommandsByCategory(getNextCommandsByCategory(matchingCommands));
        setCurrentCommand(matchingCommands[0] ?? null);
    }, [
        commandSearch,
        allCommands,
        isCommandAvailable,
        lastUsed,
        libraryCommands,
    ]);
    return ((0, jsx_runtime_1.jsxs)(Dialog_1.Dialog, { onCloseRequest: () => closeCommandPalette(), closeOnClickOutside: true, title: false, size: 720, autofocus: true, className: "command-palette-dialog", children: [(0, jsx_runtime_1.jsx)(TextField_1.TextField, { value: commandSearch, placeholder: (0, i18n_1.t)("commandPalette.search.placeholder"), onChange: (value) => {
                    setCommandSearch(value);
                }, selectOnRender: true, ref: inputRef }), app.editorInterface.formFactor !== "phone" && ((0, jsx_runtime_1.jsxs)("div", { className: "shortcuts-wrapper", children: [(0, jsx_runtime_1.jsx)(CommandShortcutHint, { shortcut: "\u2191\u2193", children: (0, i18n_1.t)("commandPalette.shortcuts.select") }), (0, jsx_runtime_1.jsx)(CommandShortcutHint, { shortcut: "\u21B5", children: (0, i18n_1.t)("commandPalette.shortcuts.confirm") }), (0, jsx_runtime_1.jsx)(CommandShortcutHint, { shortcut: (0, shortcut_1.getShortcutKey)("Esc"), children: (0, i18n_1.t)("commandPalette.shortcuts.close") })] })), (0, jsx_runtime_1.jsxs)("div", { className: "commands", children: [lastUsed && !commandSearch && ((0, jsx_runtime_1.jsxs)("div", { className: "command-category", children: [(0, jsx_runtime_1.jsxs)("div", { className: "command-category-title", children: [(0, i18n_1.t)("commandPalette.recents"), (0, jsx_runtime_1.jsx)("div", { className: "icon", style: {
                                            marginLeft: "6px",
                                        }, children: icons_1.historyCommandIcon })] }), (0, jsx_runtime_1.jsx)(CommandItem, { command: lastUsed, isSelected: lastUsed.label === currentCommand?.label, onClick: (event) => executeCommand(lastUsed, event), disabled: !isCommandAvailable(lastUsed), onMouseMove: () => setCurrentCommand(lastUsed), showShortcut: app.editorInterface.formFactor !== "phone", appState: uiAppState })] })), Object.keys(commandsByCategory).length > 0 ? (Object.keys(commandsByCategory).map((category, idx) => {
                        return ((0, jsx_runtime_1.jsxs)("div", { className: "command-category", children: [(0, jsx_runtime_1.jsx)("div", { className: "command-category-title", children: category }), commandsByCategory[category].map((command) => ((0, jsx_runtime_1.jsx)(CommandItem, { command: command, isSelected: command.label === currentCommand?.label, onClick: (event) => executeCommand(command, event), onMouseMove: () => setCurrentCommand(command), showShortcut: app.editorInterface.formFactor !== "phone", appState: uiAppState, size: category === "Library" ? "large" : "small" }, command.label)))] }, category));
                    })) : allCommands ? ((0, jsx_runtime_1.jsxs)("div", { className: "no-match", children: [(0, jsx_runtime_1.jsx)("div", { className: "icon", children: icons_1.searchIcon }), " ", (0, i18n_1.t)("commandPalette.search.noMatch")] })) : null] })] }));
}
const LibraryItemIcon = ({ id, elements, }) => {
    const ref = (0, react_1.useRef)(null);
    const { svgCache } = (0, useLibraryItemSvg_1.useLibraryCache)();
    (0, useLibraryItemSvg_1.useLibraryItemSvg)(id, elements, svgCache, ref);
    return (0, jsx_runtime_1.jsx)("div", { className: "library-item-icon", ref: ref });
};
const CommandItem = ({ command, isSelected, disabled, onMouseMove, onClick, showShortcut, appState, size = "small", }) => {
    const noop = () => { };
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("command-item", {
            "item-selected": isSelected,
            "item-disabled": disabled,
            "command-item-large": size === "large",
        }), ref: (ref) => {
            if (isSelected && !disabled) {
                ref?.scrollIntoView?.({
                    block: "nearest",
                });
            }
        }, onClick: disabled ? noop : onClick, onMouseMove: disabled ? noop : onMouseMove, title: disabled ? (0, i18n_1.t)("commandPalette.itemNotAvailable") : "", children: [(0, jsx_runtime_1.jsxs)("div", { className: "name", children: [command.icon && ((0, jsx_runtime_1.jsx)(InlineIcon_1.InlineIcon, { className: "icon", size: "var(--icon-size, 1rem)", icon: typeof command.icon === "function"
                            ? command.icon(appState, [])
                            : command.icon })), (0, jsx_runtime_1.jsx)(Ellipsify_1.Ellipsify, { children: command.label })] }), showShortcut && command.shortcut && ((0, jsx_runtime_1.jsx)(CommandShortcutHint, { shortcut: command.shortcut }))] }));
};
