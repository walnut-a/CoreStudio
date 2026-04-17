"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatInterface = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const icons_1 = require("../../icons");
const InlineIcon_1 = require("../../InlineIcon");
const i18n_1 = require("../../../i18n");
const TTDWelcomeMessage_1 = require("../TTDWelcomeMessage");
const ChatMessage_1 = require("./ChatMessage");
const ChatInterface = ({ chatId, messages, currentPrompt, onPromptChange, onGenerate, isGenerating, rateLimits, onAbort, onMermaidTabClick, onAiRepairClick, onDeleteMessage, onInsertMessage, onRetry, renderWelcomeScreen, renderWarning, }) => {
    const messagesEndRef = (0, react_1.useRef)(null);
    const textareaRef = (0, react_1.useRef)(null);
    (0, react_1.useLayoutEffect)(() => {
        messagesEndRef.current?.scrollIntoView();
    }, [messages]);
    (0, react_1.useEffect)(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [chatId]);
    const handleInputChange = (event) => {
        const value = event.target.value;
        onPromptChange(value);
    };
    const handleSubmit = () => {
        if (isGenerating && onAbort) {
            onAbort();
            return;
        }
        const trimmedPrompt = currentPrompt.trim();
        if (!trimmedPrompt) {
            return;
        }
        onGenerate({ prompt: trimmedPrompt });
        onPromptChange("");
    };
    const handleKeyDown = (event) => {
        if (event.key === common_1.KEYS.ENTER && !event.shiftKey) {
            event.preventDefault();
            if (!isGenerating) {
                handleSubmit();
            }
        }
    };
    const canSend = currentPrompt.trim().length > 3 &&
        !isGenerating &&
        (rateLimits?.rateLimitRemaining ?? 1) > 0;
    const canStop = isGenerating && !!onAbort;
    const onInput = (ev) => {
        const target = ev.target;
        target.style.height = "auto";
        target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "chat-interface", children: [(0, jsx_runtime_1.jsxs)("div", { className: "chat-interface__messages", children: [messages.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "chat-interface__welcome-screen", children: renderWelcomeScreen ? (renderWelcomeScreen({ rateLimits: rateLimits ?? null })) : ((0, jsx_runtime_1.jsx)(TTDWelcomeMessage_1.TTDWelcomeMessage, {})) })) : (messages.map((message, index) => ((0, jsx_runtime_1.jsx)(ChatMessage_1.ChatMessage, { message: message, onMermaidTabClick: onMermaidTabClick, onAiRepairClick: onAiRepairClick, onDeleteMessage: onDeleteMessage, onInsertMessage: onInsertMessage, onRetry: onRetry, rateLimitRemaining: rateLimits?.rateLimitRemaining, isLastMessage: index === messages.length - 1, renderWarning: renderWarning, 
                        // so we don't allow to repair parse errors which aren't the last message
                        allowFixingParseError: message.errorType === "parse" && index === messages.length - 1 }, message.id)))), (0, jsx_runtime_1.jsx)("div", { ref: messagesEndRef, id: "messages-end" })] }), (0, jsx_runtime_1.jsx)("div", { className: "chat-interface__input-container", children: (0, jsx_runtime_1.jsx)("div", { className: "chat-interface__input-outer", children: (0, jsx_runtime_1.jsxs)("div", { className: "chat-interface__input-wrapper", style: {
                            borderColor: isGenerating
                                ? "var(--dialog-border-color)"
                                : undefined,
                        }, children: [(0, jsx_runtime_1.jsx)("textarea", { ref: textareaRef, autoFocus: true, className: "chat-interface__input", value: currentPrompt, onChange: handleInputChange, onKeyDown: handleKeyDown, placeholder: isGenerating
                                    ? (0, i18n_1.t)("chat.generating")
                                    : rateLimits?.rateLimitRemaining === 0
                                        ? (0, i18n_1.t)("chat.rateLimit.messageLimitInputPlaceholder")
                                        : messages.length > 0
                                            ? (0, i18n_1.t)("chat.inputPlaceholderWithMessages")
                                            : (0, i18n_1.t)("chat.inputPlaceholder", { shortcut: "Shift + Enter" }), disabled: rateLimits?.rateLimitRemaining === 0, rows: 1, cols: 30, onInput: onInput }), (0, jsx_runtime_1.jsx)("button", { className: "chat-interface__send-button", onClick: handleSubmit, disabled: !canSend && !canStop, type: "button", children: (0, jsx_runtime_1.jsx)(InlineIcon_1.InlineIcon, { size: "1.5em", icon: isGenerating ? icons_1.stop : icons_1.ArrowRightIcon }) })] }) }) })] }));
};
exports.ChatInterface = ChatInterface;
