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
const jsx_runtime_1 = require("react/jsx-runtime");
const common_1 = require("@excalidraw/common");
const tunnels_1 = require("../../context/tunnels");
const ui_appState_1 = require("../../context/ui-appState");
const i18n_1 = require("../../i18n");
const App_1 = require("../App");
const UserList_1 = require("../UserList");
const DropdownMenu_1 = __importDefault(require("../dropdownMenu/DropdownMenu"));
const DropdownMenuSub_1 = __importDefault(require("../dropdownMenu/DropdownMenuSub"));
const withInternalFallback_1 = require("../hoc/withInternalFallback");
const icons_1 = require("../icons");
const DefaultItems = __importStar(require("./DefaultItems"));
const MainMenu = Object.assign((0, withInternalFallback_1.withInternalFallback)("MainMenu", ({ children, onSelect, }) => {
    const { MainMenuTunnel } = (0, tunnels_1.useTunnels)();
    const editorInterface = (0, App_1.useEditorInterface)();
    const appState = (0, ui_appState_1.useUIAppState)();
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    return ((0, jsx_runtime_1.jsx)(MainMenuTunnel.In, { children: (0, jsx_runtime_1.jsxs)(DropdownMenu_1.default, { open: appState.openMenu === "canvas", children: [(0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Trigger, { onToggle: () => {
                        setAppState({
                            openMenu: appState.openMenu === "canvas" ? null : "canvas",
                            openPopup: null,
                            openDialog: null,
                        });
                    }, "data-testid": "main-menu-trigger", className: "main-menu-trigger", children: icons_1.HamburgerMenuIcon }), (0, jsx_runtime_1.jsxs)(DropdownMenu_1.default.Content, { onClickOutside: () => setAppState({ openMenu: null }), onSelect: (0, common_1.composeEventHandlers)(onSelect, () => {
                        setAppState({ openMenu: null });
                    }), className: "main-menu", align: "start", children: [children, editorInterface.formFactor === "phone" &&
                            appState.collaborators.size > 0 && ((0, jsx_runtime_1.jsxs)("fieldset", { className: "UserList-Wrapper", children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.collaborators") }), (0, jsx_runtime_1.jsx)(UserList_1.UserList, { mobile: true, collaborators: appState.collaborators, userToFollow: appState.userToFollow?.socketId || null })] }))] })] }) }));
}), {
    Trigger: DropdownMenu_1.default.Trigger,
    Item: DropdownMenu_1.default.Item,
    ItemLink: DropdownMenu_1.default.ItemLink,
    ItemCustom: DropdownMenu_1.default.ItemCustom,
    Group: DropdownMenu_1.default.Group,
    Separator: DropdownMenu_1.default.Separator,
    Sub: DropdownMenuSub_1.default,
    DefaultItems,
});
exports.default = MainMenu;
