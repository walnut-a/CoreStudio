"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessage = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const i18n_1 = require("../../../i18n");
const FilledButton_1 = require("../../FilledButton");
const icons_1 = require("../../icons");
const ChatMessage = ({ message, onMermaidTabClick, onAiRepairClick, onDeleteMessage, onInsertMessage, onRetry, rateLimitRemaining, isLastMessage, renderWarning, allowFixingParseError, }) => {
    const [canRetry, setCanRetry] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (!message.error || !isLastMessage) {
            return;
        }
        if (message.error && !message.lastAttemptAt) {
            setCanRetry(true);
            return;
        }
        const timeSinceLastAttempt = Date.now() - message.lastAttemptAt;
        const remainingTime = Math.max(0, 5000 - timeSinceLastAttempt);
        if (remainingTime === 0) {
            setCanRetry(true);
            return;
        }
        setCanRetry(false);
        const timer = setTimeout(() => {
            setCanRetry(true);
        }, remainingTime);
        return () => clearTimeout(timer);
    }, [message.error, message.lastAttemptAt, isLastMessage]);
    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };
    if (message.type === "warning") {
        const customOverride = renderWarning?.(message);
        return ((0, jsx_runtime_1.jsx)("div", { className: "chat-message chat-message--system", children: (0, jsx_runtime_1.jsxs)("div", { className: "chat-message__content", children: [(0, jsx_runtime_1.jsxs)("div", { className: "chat-message__header", children: [(0, jsx_runtime_1.jsx)("span", { className: "chat-message__role", children: (0, i18n_1.t)("chat.role.system") }), (0, jsx_runtime_1.jsx)("span", { className: "chat-message__timestamp", children: formatTime(message.timestamp) })] }), (0, jsx_runtime_1.jsx)("div", { className: "chat-message__body", children: (0, jsx_runtime_1.jsx)("div", { className: "chat-message__text", children: customOverride ? (customOverride) : message.warningType === "messageLimitExceeded" ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, i18n_1.t)("chat.rateLimit.messageLimit"), (0, jsx_runtime_1.jsx)("div", { style: { marginTop: "10px" }, children: (0, jsx_runtime_1.jsx)(FilledButton_1.FilledButton, { onClick: () => {
                                                window.open(`${import.meta.env.VITE_APP_PLUS_LP}/plus?utm_source=excalidraw&utm_medium=app&utm_content=ttdChatBanner#excalidraw-redirect`, "_blank", "noopener");
                                            }, children: (0, i18n_1.t)("chat.upsellBtnLabel") }) })] })) : ((0, i18n_1.t)("chat.rateLimit.generalRateLimit")) }) })] }) }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: `chat-message chat-message--${message.type}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "chat-message__content", children: [(0, jsx_runtime_1.jsxs)("div", { className: "chat-message__header", children: [(0, jsx_runtime_1.jsx)("span", { className: "chat-message__role", children: message.type === "user"
                                    ? (0, i18n_1.t)("chat.role.user")
                                    : (0, i18n_1.t)("chat.role.assistant") }), (0, jsx_runtime_1.jsx)("span", { className: "chat-message__timestamp", children: formatTime(message.timestamp) })] }), (0, jsx_runtime_1.jsx)("div", { className: "chat-message__body", children: message.error ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "chat-message__error", children: message.content }), message.errorType !== "parse" && ((0, jsx_runtime_1.jsxs)("div", { className: "chat-message__error_message", children: ["Error: ", message.error || (0, i18n_1.t)("chat.errors.generationFailed")] })), message.errorType === "parse" && allowFixingParseError && ((0, jsx_runtime_1.jsxs)("div", { className: "chat-message__error_message", children: [(0, jsx_runtime_1.jsx)("p", { children: (0, i18n_1.t)("chat.errors.invalidDiagram") }), (0, jsx_runtime_1.jsxs)("div", { className: "chat-message__error-actions", children: [onMermaidTabClick && ((0, jsx_runtime_1.jsx)("button", { className: "chat-message__error-link", onClick: () => onMermaidTabClick(message), type: "button", children: (0, i18n_1.t)("chat.errors.fixInMermaid") })), onAiRepairClick && ((0, jsx_runtime_1.jsx)("button", { className: "chat-message__error-link", onClick: () => onAiRepairClick(message), disabled: rateLimitRemaining === 0, type: "button", children: (0, i18n_1.t)("chat.errors.aiRepair") }))] })] }))] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "chat-message__text", children: [message.content, message.isGenerating && ((0, jsx_runtime_1.jsx)("span", { className: "chat-message__cursor", children: "\u258B" }))] })) })] }), message.type === "assistant" && !message.isGenerating && ((0, jsx_runtime_1.jsxs)("div", { className: "chat-message__actions", children: [!message.error && onInsertMessage && ((0, jsx_runtime_1.jsx)("button", { className: "chat-message__action", onClick: () => onInsertMessage(message), type: "button", "aria-label": (0, i18n_1.t)("chat.insert"), title: (0, i18n_1.t)("chat.insert"), children: icons_1.stackPushIcon })), onMermaidTabClick && message.content && ((0, jsx_runtime_1.jsx)("button", { className: "chat-message__action", onClick: () => onMermaidTabClick(message), type: "button", "aria-label": (0, i18n_1.t)("chat.viewAsMermaid"), title: (0, i18n_1.t)("chat.viewAsMermaid"), children: icons_1.codeIcon })), onDeleteMessage && message.errorType !== "network" && ((0, jsx_runtime_1.jsx)("button", { className: "chat-message__action chat-message__action--danger", onClick: () => onDeleteMessage(message.id), type: "button", "aria-label": (0, i18n_1.t)("chat.deleteMessage"), title: (0, i18n_1.t)("chat.deleteMessage"), children: icons_1.TrashIcon })), message.errorType === "network" && onRetry && isLastMessage && ((0, jsx_runtime_1.jsx)("button", { className: (0, clsx_1.default)("chat-message__action", { invisible: !canRetry }), onClick: () => onRetry(message), type: "button", "aria-label": (0, i18n_1.t)("chat.retry"), title: (0, i18n_1.t)("chat.retry"), children: icons_1.RetryIcon }))] }))] }));
};
exports.ChatMessage = ChatMessage;
