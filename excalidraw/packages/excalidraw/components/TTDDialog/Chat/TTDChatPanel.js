"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTDChatPanel = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const i18n_1 = require("../../../i18n");
const icons_1 = require("../../icons");
const InlineIcon_1 = require("../../InlineIcon");
const TTDDialogPanel_1 = require("../TTDDialogPanel");
const editor_jotai_1 = require("../../../editor-jotai");
const TTDContext_1 = require("../TTDContext");
const ChatHistoryMenu_1 = require("./ChatHistoryMenu");
const ChatInterface_1 = require("./ChatInterface");
const TTDChatPanel = ({ chatId, messages, currentPrompt, onPromptChange, onGenerate, isGenerating, generatedResponse, isMenuOpen, onMenuToggle, onMenuClose, onNewChat, onRestoreChat, onDeleteChat, savedChats, activeSessionId, onAbort, onMermaidTabClick, onAiRepairClick, onDeleteMessage, onInsertMessage, onRetry, onViewAsMermaid, renderWelcomeScreen, renderWarning, }) => {
    const [rateLimits] = (0, editor_jotai_1.useAtom)(TTDContext_1.rateLimitsAtom);
    const getPanelActions = () => {
        const actions = [];
        if (rateLimits) {
            actions.push({
                label: (0, i18n_1.t)("chat.rateLimitRemaining", {
                    count: rateLimits.rateLimitRemaining,
                }),
                variant: "rateLimit",
                className: rateLimits.rateLimitRemaining < 5
                    ? "ttd-dialog-panel__rate-limit--danger"
                    : "",
            });
        }
        if (generatedResponse) {
            actions.push({
                action: onViewAsMermaid,
                label: (0, i18n_1.t)("chat.viewAsMermaid"),
                icon: (0, jsx_runtime_1.jsx)(InlineIcon_1.InlineIcon, { icon: icons_1.ArrowRightIcon }),
                variant: "link",
            });
        }
        return actions;
    };
    const actions = getPanelActions();
    const getPanelActionFlexProp = () => {
        if (actions.length === 2) {
            return "space-between";
        }
        if (actions.length === 1 && actions[0].variant === "rateLimit") {
            return "flex-start";
        }
        return "flex-end";
    };
    return ((0, jsx_runtime_1.jsx)(TTDDialogPanel_1.TTDDialogPanel, { label: (0, jsx_runtime_1.jsxs)("div", { className: "ttd-dialog-panel__label-wrapper", children: [(0, jsx_runtime_1.jsx)("div", { className: "ttd-dialog-panel__label-group" }), (0, jsx_runtime_1.jsx)("div", { className: "ttd-dialog-panel__header-right", children: (0, jsx_runtime_1.jsx)(ChatHistoryMenu_1.ChatHistoryMenu, { isNewChatBtnVisible: !!messages.length, isOpen: isMenuOpen, onToggle: onMenuToggle, onClose: onMenuClose, onNewChat: onNewChat, onRestoreChat: onRestoreChat, onDeleteChat: onDeleteChat, savedChats: savedChats, activeSessionId: activeSessionId, disabled: isGenerating }) })] }), className: "ttd-dialog-chat-panel", panelActionJustifyContent: getPanelActionFlexProp(), panelActions: actions, children: (0, jsx_runtime_1.jsx)(ChatInterface_1.ChatInterface, { chatId: chatId, messages: messages, currentPrompt: currentPrompt, onPromptChange: onPromptChange, onGenerate: onGenerate, isGenerating: isGenerating, generatedResponse: generatedResponse, onAbort: onAbort, onMermaidTabClick: onMermaidTabClick, onAiRepairClick: onAiRepairClick, onDeleteMessage: onDeleteMessage, onInsertMessage: onInsertMessage, onRetry: onRetry, rateLimits: rateLimits, renderWelcomeScreen: renderWelcomeScreen, renderWarning: renderWarning }) }));
};
exports.TTDChatPanel = TTDChatPanel;
