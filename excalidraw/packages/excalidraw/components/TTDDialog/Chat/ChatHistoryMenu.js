"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatHistoryMenu = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const i18n_1 = require("../../../i18n");
const icons_1 = require("../../icons");
const DropdownMenu_1 = __importDefault(require("../../dropdownMenu/DropdownMenu"));
const FilledButton_1 = require("../../FilledButton");
const ChatHistoryMenu = ({ isOpen, onToggle, onClose, onNewChat, onRestoreChat, onDeleteChat, isNewChatBtnVisible, savedChats, activeSessionId, disabled, }) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "ttd-chat-history-menu", children: [isNewChatBtnVisible && ((0, jsx_runtime_1.jsx)(FilledButton_1.FilledButton, { onClick: onNewChat, disabled: disabled, children: (0, i18n_1.t)("chat.newChat") })), savedChats.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "ttd-dialog-panel__menu-wrapper", children: (0, jsx_runtime_1.jsxs)(DropdownMenu_1.default, { open: isOpen, children: [(0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Trigger, { onToggle: onToggle, className: "ttd-dialog-menu-trigger", disabled: disabled, title: (0, i18n_1.t)("chat.menu"), "aria-label": (0, i18n_1.t)("chat.menu"), children: icons_1.historyIcon }), (0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Content, { onClickOutside: onClose, onSelect: onClose, children: (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: savedChats.map((chat) => ((0, jsx_runtime_1.jsxs)(DropdownMenu_1.default.ItemCustom, { className: (0, clsx_1.default)("ttd-chat-menu-item", {
                                        "ttd-chat-menu-item--active": chat.id === activeSessionId,
                                    }), onClick: () => {
                                        onRestoreChat(chat);
                                    }, children: [(0, jsx_runtime_1.jsx)("span", { className: "ttd-chat-menu-item__title", children: chat.title }), (0, jsx_runtime_1.jsx)("button", { className: "ttd-chat-menu-item__delete", onClick: (e) => onDeleteChat(chat.id, e), title: (0, i18n_1.t)("chat.deleteChat"), "aria-label": (0, i18n_1.t)("chat.deleteChat"), type: "button", children: icons_1.TrashIcon })] }, chat.id))) }) })] }) }))] }));
};
exports.ChatHistoryMenu = ChatHistoryMenu;
