"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Preferences = exports.PreferencesToggleZenModeItem = exports.PreferencesToggleGridModeItem = exports.LiveCollaborationTrigger = exports.Socials = exports.Export = exports.ChangeCanvasBackground = exports.ToggleTheme = exports.ClearCanvas = exports.Help = exports.SearchMenu = exports.CommandPalette = exports.SaveAsImage = exports.SaveToActiveFile = exports.LoadScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const common_1 = require("@excalidraw/common");
const actions_1 = require("../../actions");
const actionToggleViewMode_1 = require("../../actions/actionToggleViewMode");
const shortcuts_1 = require("../../actions/shortcuts");
const analytics_1 = require("../../analytics");
const ui_appState_1 = require("../../context/ui-appState");
const editor_jotai_1 = require("../../editor-jotai");
const i18n_1 = require("../../i18n");
const ActiveConfirmDialog_1 = require("../ActiveConfirmDialog");
const App_1 = require("../App");
const OverwriteConfirmState_1 = require("../OverwriteConfirm/OverwriteConfirmState");
const Trans_1 = __importDefault(require("../Trans"));
const DropdownMenuItem_1 = __importDefault(require("../dropdownMenu/DropdownMenuItem"));
const DropdownMenuItemCheckbox_1 = __importDefault(require("../dropdownMenu/DropdownMenuItemCheckbox"));
const DropdownMenuItemContentRadio_1 = __importDefault(require("../dropdownMenu/DropdownMenuItemContentRadio"));
const DropdownMenuItemLink_1 = __importDefault(require("../dropdownMenu/DropdownMenuItemLink"));
const DropdownMenuSub_1 = __importDefault(require("../dropdownMenu/DropdownMenuSub"));
const icons_1 = require("../icons");
const icons_2 = require("../icons");
require("./DefaultItems.scss");
const LoadScene = () => {
    const { t } = (0, i18n_1.useI18n)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    const elements = (0, App_1.useExcalidrawElements)();
    if (!actionManager.isActionEnabled(actions_1.actionLoadScene)) {
        return null;
    }
    const handleSelect = async () => {
        if (!elements.length ||
            (await (0, OverwriteConfirmState_1.openConfirmModal)({
                title: t("overwriteConfirm.modal.loadFromFile.title"),
                actionLabel: t("overwriteConfirm.modal.loadFromFile.button"),
                color: "warning",
                description: ((0, jsx_runtime_1.jsx)(Trans_1.default, { i18nKey: "overwriteConfirm.modal.loadFromFile.description", bold: (text) => (0, jsx_runtime_1.jsx)("strong", { children: text }), br: () => (0, jsx_runtime_1.jsx)("br", {}) })),
            }))) {
            actionManager.executeAction(actions_1.actionLoadScene);
        }
    };
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItem_1.default, { icon: icons_2.LoadIcon, onSelect: handleSelect, "data-testid": "load-button", shortcut: (0, shortcuts_1.getShortcutFromShortcutName)("loadScene"), "aria-label": t("buttons.load"), children: t("buttons.load") }));
};
exports.LoadScene = LoadScene;
exports.LoadScene.displayName = "LoadScene";
const SaveToActiveFile = () => {
    const { t } = (0, i18n_1.useI18n)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    if (!actionManager.isActionEnabled(actions_1.actionSaveToActiveFile)) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItem_1.default, { shortcut: (0, shortcuts_1.getShortcutFromShortcutName)("saveScene"), "data-testid": "save-button", onSelect: () => actionManager.executeAction(actions_1.actionSaveToActiveFile), icon: icons_2.save, "aria-label": `${t("buttons.save")}`, children: `${t("buttons.save")}` }));
};
exports.SaveToActiveFile = SaveToActiveFile;
exports.SaveToActiveFile.displayName = "SaveToActiveFile";
const SaveAsImage = () => {
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const { t } = (0, i18n_1.useI18n)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItem_1.default, { icon: icons_2.ExportImageIcon, "data-testid": "image-export-button", onSelect: () => setAppState({ openDialog: { name: "imageExport" } }), shortcut: (0, shortcuts_1.getShortcutFromShortcutName)("imageExport"), "aria-label": t("buttons.exportImage"), children: t("buttons.exportImage") }));
};
exports.SaveAsImage = SaveAsImage;
exports.SaveAsImage.displayName = "SaveAsImage";
const CommandPalette = (opts) => {
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const { t } = (0, i18n_1.useI18n)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItem_1.default, { icon: icons_2.boltIcon, "data-testid": "command-palette-button", onSelect: () => {
            (0, analytics_1.trackEvent)("command_palette", "open", "menu");
            setAppState({ openDialog: { name: "commandPalette" } });
        }, shortcut: (0, shortcuts_1.getShortcutFromShortcutName)("commandPalette"), "aria-label": t("commandPalette.title"), className: opts?.className, children: t("commandPalette.title") }));
};
exports.CommandPalette = CommandPalette;
exports.CommandPalette.displayName = "CommandPalette";
const SearchMenu = (opts) => {
    const { t } = (0, i18n_1.useI18n)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItem_1.default, { icon: icons_2.searchIcon, "data-testid": "search-menu-button", onSelect: () => {
            actionManager.executeAction(actions_1.actionToggleSearchMenu);
        }, shortcut: (0, shortcuts_1.getShortcutFromShortcutName)("searchMenu"), "aria-label": t("search.title"), className: opts?.className, children: t("search.title") }));
};
exports.SearchMenu = SearchMenu;
exports.SearchMenu.displayName = "SearchMenu";
const Help = () => {
    const { t } = (0, i18n_1.useI18n)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItem_1.default, { "data-testid": "help-menu-item", icon: icons_2.HelpIcon, onSelect: () => actionManager.executeAction(actions_1.actionShortcuts), shortcut: "?", "aria-label": t("helpDialog.title"), children: t("helpDialog.title") }));
};
exports.Help = Help;
exports.Help.displayName = "Help";
const ClearCanvas = () => {
    const { t } = (0, i18n_1.useI18n)();
    const setActiveConfirmDialog = (0, editor_jotai_1.useSetAtom)(ActiveConfirmDialog_1.activeConfirmDialogAtom);
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    if (!actionManager.isActionEnabled(actions_1.actionClearCanvas)) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItem_1.default, { icon: icons_2.TrashIcon, onSelect: () => setActiveConfirmDialog("clearCanvas"), "data-testid": "clear-canvas-button", "aria-label": t("buttons.clearReset"), children: t("buttons.clearReset") }));
};
exports.ClearCanvas = ClearCanvas;
exports.ClearCanvas.displayName = "ClearCanvas";
const ToggleTheme = (props) => {
    const { t } = (0, i18n_1.useI18n)();
    const appState = (0, ui_appState_1.useUIAppState)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    const shortcut = (0, shortcuts_1.getShortcutFromShortcutName)("toggleTheme");
    if (!actionManager.isActionEnabled(actions_1.actionToggleTheme)) {
        return null;
    }
    if (props?.allowSystemTheme) {
        return ((0, jsx_runtime_1.jsx)(DropdownMenuItemContentRadio_1.default, { name: "theme", value: props.theme, onChange: (value) => props.onSelect(value), choices: [
                {
                    value: common_1.THEME.LIGHT,
                    label: icons_2.SunIcon,
                    ariaLabel: `${t("buttons.lightMode")} - ${shortcut}`,
                },
                {
                    value: common_1.THEME.DARK,
                    label: icons_2.MoonIcon,
                    ariaLabel: `${t("buttons.darkMode")} - ${shortcut}`,
                },
                {
                    value: "system",
                    label: icons_2.DeviceDesktopIcon,
                    ariaLabel: t("buttons.systemMode"),
                },
            ], children: t("labels.theme") }));
    }
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItem_1.default, { onSelect: (event) => {
            // do not close the menu when changing theme
            event.preventDefault();
            if (props?.onSelect) {
                props.onSelect(appState.theme === common_1.THEME.DARK ? common_1.THEME.LIGHT : common_1.THEME.DARK);
            }
            else {
                return actionManager.executeAction(actions_1.actionToggleTheme);
            }
        }, icon: appState.theme === common_1.THEME.DARK ? icons_2.SunIcon : icons_2.MoonIcon, "data-testid": "toggle-dark-mode", shortcut: shortcut, "aria-label": appState.theme === common_1.THEME.DARK
            ? t("buttons.lightMode")
            : t("buttons.darkMode"), children: appState.theme === common_1.THEME.DARK
            ? t("buttons.lightMode")
            : t("buttons.darkMode") }));
};
exports.ToggleTheme = ToggleTheme;
exports.ToggleTheme.displayName = "ToggleTheme";
const ChangeCanvasBackground = () => {
    const { t } = (0, i18n_1.useI18n)();
    const appState = (0, ui_appState_1.useUIAppState)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    const appProps = (0, App_1.useAppProps)();
    if (appState.viewModeEnabled ||
        !appProps.UIOptions.canvasActions.changeViewBackgroundColor) {
        return null;
    }
    return ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: "0.75rem" }, children: [(0, jsx_runtime_1.jsx)("div", { "data-testid": "canvas-background-label", style: {
                    fontSize: "0.875rem",
                    marginBottom: "0.25rem",
                    marginLeft: "0.5rem",
                }, children: t("labels.canvasBackground") }), (0, jsx_runtime_1.jsx)("div", { style: { padding: "0 0.625rem" }, children: actionManager.renderAction("changeViewBackgroundColor") })] }));
};
exports.ChangeCanvasBackground = ChangeCanvasBackground;
exports.ChangeCanvasBackground.displayName = "ChangeCanvasBackground";
const Export = () => {
    const { t } = (0, i18n_1.useI18n)();
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItem_1.default, { icon: icons_2.ExportIcon, onSelect: () => {
            setAppState({ openDialog: { name: "jsonExport" } });
        }, "data-testid": "json-export-button", "aria-label": t("buttons.export"), children: t("buttons.export") }));
};
exports.Export = Export;
exports.Export.displayName = "Export";
const Socials = () => {
    const { t } = (0, i18n_1.useI18n)();
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(DropdownMenuItemLink_1.default, { icon: icons_1.GithubIcon, href: "https://github.com/excalidraw/excalidraw", "aria-label": "GitHub", children: "GitHub" }), (0, jsx_runtime_1.jsx)(DropdownMenuItemLink_1.default, { icon: icons_1.XBrandIcon, href: "https://x.com/excalidraw", "aria-label": "X", children: t("labels.followUs") }), (0, jsx_runtime_1.jsx)(DropdownMenuItemLink_1.default, { icon: icons_1.DiscordIcon, href: "https://discord.gg/UexuTaE", "aria-label": "Discord", children: t("labels.discordChat") })] }));
};
exports.Socials = Socials;
exports.Socials.displayName = "Socials";
const LiveCollaborationTrigger = ({ onSelect, isCollaborating, }) => {
    const { t } = (0, i18n_1.useI18n)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItem_1.default, { "data-testid": "collab-button", icon: icons_2.usersIcon, className: (0, clsx_1.default)({
            "active-collab": isCollaborating,
        }), onSelect: onSelect, children: t("labels.liveCollaboration") }));
};
exports.LiveCollaborationTrigger = LiveCollaborationTrigger;
exports.LiveCollaborationTrigger.displayName = "LiveCollaborationTrigger";
const PreferencesToggleToolLockItem = () => {
    const { t } = (0, i18n_1.useI18n)();
    const app = (0, App_1.useApp)();
    const appState = (0, ui_appState_1.useUIAppState)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItemCheckbox_1.default, { checked: appState.activeTool.locked, shortcut: (0, shortcuts_1.getShortcutFromShortcutName)("toolLock"), onSelect: (event) => {
            app.toggleLock();
            event.preventDefault();
        }, children: t("labels.preferences_toolLock") }));
};
const PreferencesBoxSelectionModeItem = () => {
    const { t } = (0, i18n_1.useI18n)();
    const appState = (0, ui_appState_1.useUIAppState)();
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItemContentRadio_1.default, { name: "boxSelectionMode", icon: icons_1.emptyIcon, value: appState.boxSelectionMode, onChange: (value) => {
            setAppState({
                boxSelectionMode: value,
            });
        }, choices: [
            {
                value: "contain",
                label: t("labels.boxSelectionContain"),
                ariaLabel: t("labels.boxSelectionContain"),
            },
            {
                value: "overlap",
                label: t("labels.boxSelectionOverlap"),
                ariaLabel: t("labels.boxSelectionOverlap"),
            },
        ], children: t("labels.boxSelectionMode") }));
};
const PreferencesToggleSnapModeItem = () => {
    const { t } = (0, i18n_1.useI18n)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    const appState = (0, ui_appState_1.useUIAppState)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItemCheckbox_1.default, { checked: appState.objectsSnapModeEnabled, shortcut: (0, shortcuts_1.getShortcutFromShortcutName)("objectsSnapMode"), onSelect: (event) => {
            actionManager.executeAction(actions_1.actionToggleObjectsSnapMode);
            event.preventDefault();
        }, children: t("buttons.objectsSnapMode") }));
};
const PreferencesToggleArrowBindingItem = () => {
    const { t } = (0, i18n_1.useI18n)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    const appState = (0, ui_appState_1.useUIAppState)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItemCheckbox_1.default, { checked: appState.bindingPreference === "enabled", onSelect: (event) => {
            actionManager.executeAction(actions_1.actionToggleArrowBinding);
            event.preventDefault();
        }, children: t("labels.arrowBinding") }));
};
const PreferencesToggleMidpointSnappingItem = () => {
    const { t } = (0, i18n_1.useI18n)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    const appState = (0, ui_appState_1.useUIAppState)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItemCheckbox_1.default, { checked: appState.isMidpointSnappingEnabled, onSelect: (event) => {
            actionManager.executeAction(actions_1.actionToggleMidpointSnapping);
            event.preventDefault();
        }, children: t("labels.midpointSnapping") }));
};
const PreferencesToggleGridModeItem = () => {
    const { t } = (0, i18n_1.useI18n)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    const appState = (0, ui_appState_1.useUIAppState)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItemCheckbox_1.default, { checked: appState.gridModeEnabled, shortcut: (0, shortcuts_1.getShortcutFromShortcutName)("gridMode"), onSelect: (event) => {
            actionManager.executeAction(actions_1.actionToggleGridMode);
            event.preventDefault();
        }, children: t("labels.toggleGrid") }));
};
exports.PreferencesToggleGridModeItem = PreferencesToggleGridModeItem;
const PreferencesToggleZenModeItem = () => {
    const { t } = (0, i18n_1.useI18n)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    const appState = (0, ui_appState_1.useUIAppState)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItemCheckbox_1.default, { checked: appState.zenModeEnabled, shortcut: (0, shortcuts_1.getShortcutFromShortcutName)("zenMode"), onSelect: (event) => {
            actionManager.executeAction(actions_1.actionToggleZenMode);
            event.preventDefault();
        }, children: t("buttons.zenMode") }));
};
exports.PreferencesToggleZenModeItem = PreferencesToggleZenModeItem;
const PreferencesToggleViewModeItem = () => {
    const { t } = (0, i18n_1.useI18n)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    const appState = (0, ui_appState_1.useUIAppState)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItemCheckbox_1.default, { checked: appState.viewModeEnabled, shortcut: (0, shortcuts_1.getShortcutFromShortcutName)("viewMode"), onSelect: (event) => {
            actionManager.executeAction(actionToggleViewMode_1.actionToggleViewMode);
            event.preventDefault();
        }, children: t("labels.viewMode") }));
};
const PreferencesToggleElementPropertiesItem = () => {
    const { t } = (0, i18n_1.useI18n)();
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    const appState = (0, ui_appState_1.useUIAppState)();
    return ((0, jsx_runtime_1.jsx)(DropdownMenuItemCheckbox_1.default, { checked: appState.stats.open, shortcut: (0, shortcuts_1.getShortcutFromShortcutName)("stats"), onSelect: (event) => {
            actionManager.executeAction(actions_1.actionToggleStats);
            event.preventDefault();
        }, children: t("stats.fullTitle") }));
};
const Preferences = ({ children, additionalItems, }) => {
    const { t } = (0, i18n_1.useI18n)();
    return ((0, jsx_runtime_1.jsxs)(DropdownMenuSub_1.default, { children: [(0, jsx_runtime_1.jsx)(DropdownMenuSub_1.default.Trigger, { icon: icons_1.settingsIcon, children: t("labels.preferences") }), (0, jsx_runtime_1.jsxs)(DropdownMenuSub_1.default.Content, { className: "excalidraw-main-menu-preferences-submenu", children: [children || ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PreferencesBoxSelectionModeItem, {}), (0, jsx_runtime_1.jsx)(PreferencesToggleToolLockItem, {}), (0, jsx_runtime_1.jsx)(PreferencesToggleSnapModeItem, {}), (0, jsx_runtime_1.jsx)(exports.PreferencesToggleGridModeItem, {}), (0, jsx_runtime_1.jsx)(exports.PreferencesToggleZenModeItem, {}), (0, jsx_runtime_1.jsx)(PreferencesToggleViewModeItem, {}), (0, jsx_runtime_1.jsx)(PreferencesToggleElementPropertiesItem, {}), (0, jsx_runtime_1.jsx)(PreferencesToggleArrowBindingItem, {}), (0, jsx_runtime_1.jsx)(PreferencesToggleMidpointSnappingItem, {})] })), additionalItems] })] }));
};
exports.Preferences = Preferences;
exports.Preferences.ToggleToolLock = PreferencesToggleToolLockItem;
exports.Preferences.BoxSelectionMode = PreferencesBoxSelectionModeItem;
exports.Preferences.ToggleSnapMode = PreferencesToggleSnapModeItem;
exports.Preferences.ToggleArrowBinding = PreferencesToggleArrowBindingItem;
exports.Preferences.ToggleMidpointSnapping = PreferencesToggleMidpointSnappingItem;
exports.Preferences.ToggleGridMode = exports.PreferencesToggleGridModeItem;
exports.Preferences.ToggleZenMode = exports.PreferencesToggleZenModeItem;
exports.Preferences.ToggleViewMode = PreferencesToggleViewModeItem;
exports.Preferences.ToggleElementProperties = PreferencesToggleElementPropertiesItem;
exports.Preferences.displayName = "Preferences";
