"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextToDiagram = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const editor_jotai_1 = require("../../editor-jotai");
const App_1 = require("../App");
const Chat_1 = require("./Chat");
const common_1 = require("./common");
const TTDContext_1 = require("./TTDContext");
const useTTDChatStorage_1 = require("./useTTDChatStorage");
const useMermaidRenderer_1 = require("./hooks/useMermaidRenderer");
const useTextGeneration_1 = require("./hooks/useTextGeneration");
const useChatManagement_1 = require("./hooks/useChatManagement");
const TTDChatPanel_1 = require("./Chat/TTDChatPanel");
const TTDPreviewPanel_1 = require("./TTDPreviewPanel");
const chat_1 = require("./utils/chat");
const TextToDiagramContent = ({ mermaidToExcalidrawLib, onTextSubmit, renderWelcomeScreen, renderWarning, persistenceAdapter, }) => {
    const app = (0, App_1.useApp)();
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const canvasRef = (0, react_1.useRef)(null);
    const [error, setError] = (0, editor_jotai_1.useAtom)(TTDContext_1.errorAtom);
    const [chatHistory, setChatHistory] = (0, editor_jotai_1.useAtom)(TTDContext_1.chatHistoryAtom);
    const showPreview = (0, editor_jotai_1.useAtomValue)(TTDContext_1.showPreviewAtom);
    const { savedChats } = (0, useTTDChatStorage_1.useTTDChatStorage)({ persistenceAdapter });
    const lastAssistantMessage = (0, chat_1.getLastAssistantMessage)(chatHistory);
    const { setLastRetryAttempt } = (0, Chat_1.useChatAgent)();
    const { data } = (0, useMermaidRenderer_1.useMermaidRenderer)({
        canvasRef,
        mermaidToExcalidrawLib,
    });
    const { onGenerate, handleAbort } = (0, useTextGeneration_1.useTextGeneration)({
        onTextSubmit,
    });
    const { isMenuOpen, onRestoreChat, handleDeleteChat, handleNewChat, handleMenuToggle, handleMenuClose, } = (0, useChatManagement_1.useChatManagement)({ persistenceAdapter });
    const onViewAsMermaid = () => {
        if (typeof lastAssistantMessage?.content === "string") {
            (0, common_1.saveMermaidDataToStorage)(lastAssistantMessage.content);
            setAppState({
                openDialog: { name: "ttd", tab: "mermaid" },
            });
        }
    };
    const handleMermaidTabClick = (message) => {
        const mermaidContent = message.content || "";
        if (mermaidContent) {
            (0, common_1.saveMermaidDataToStorage)(mermaidContent);
            setAppState({
                openDialog: { name: "ttd", tab: "mermaid" },
            });
        }
    };
    const handleInsertMessage = async (message) => {
        const mermaidContent = message.content || "";
        if (!mermaidContent.trim() || !mermaidToExcalidrawLib.loaded) {
            return;
        }
        const tempDataRef = {
            current: {
                elements: [],
                files: null,
            },
        };
        const result = await (0, common_1.convertMermaidToExcalidraw)({
            canvasRef,
            data: tempDataRef,
            mermaidToExcalidrawLib,
            setError,
            mermaidDefinition: mermaidContent,
            theme: app.state.theme,
        });
        if (result.success) {
            (0, common_1.insertToEditor)({
                app,
                data: tempDataRef,
                text: mermaidContent,
                shouldSaveMermaidDataToStorage: true,
            });
        }
    };
    const handleAiRepairClick = async (message) => {
        const mermaidContent = message.content || "";
        const errorMessage = message.error || "";
        if (!mermaidContent) {
            return;
        }
        const repairPrompt = `Fix the error in this Mermaid diagram. The diagram is:\n\n\`\`\`mermaid\n${mermaidContent}\n\`\`\`\n\nThe exception/error is: ${errorMessage}\n\nPlease fix the Mermaid syntax and regenerate a valid diagram.`;
        await onGenerate({ prompt: repairPrompt, isRepairFlow: true });
    };
    const handleRetry = async (message) => {
        const messageIndex = chatHistory.messages.findIndex((msg) => msg.id === message.id);
        if (messageIndex > 0) {
            const previousMessage = chatHistory.messages[messageIndex - 1];
            if (previousMessage.type === "user" &&
                typeof previousMessage.content === "string") {
                setLastRetryAttempt();
                await onGenerate({
                    prompt: previousMessage.content,
                    isRepairFlow: true,
                });
            }
        }
    };
    const handleInsertToEditor = () => {
        (0, common_1.insertToEditor)({ app, data });
    };
    const handleDeleteMessage = (messageId) => {
        const assistantMessageIndex = chatHistory.messages.findIndex((msg) => msg.id === messageId && msg.type === "assistant");
        const remainingMessages = chatHistory.messages.slice(0, assistantMessageIndex - 1);
        setChatHistory({
            ...chatHistory,
            messages: remainingMessages,
        });
    };
    const handlePromptChange = (newPrompt) => {
        setChatHistory((prev) => ({
            ...prev,
            currentPrompt: newPrompt,
        }));
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: `ttd-dialog-layout ${showPreview
            ? "ttd-dialog-layout--split"
            : "ttd-dialog-layout--chat-only"}`, children: [(0, jsx_runtime_1.jsx)(TTDChatPanel_1.TTDChatPanel, { chatId: chatHistory.id, messages: chatHistory.messages, currentPrompt: chatHistory.currentPrompt, onPromptChange: handlePromptChange, onGenerate: onGenerate, isGenerating: lastAssistantMessage?.isGenerating ?? false, generatedResponse: lastAssistantMessage?.content, isMenuOpen: isMenuOpen, onMenuToggle: handleMenuToggle, onMenuClose: handleMenuClose, onNewChat: handleNewChat, onRestoreChat: onRestoreChat, onDeleteChat: handleDeleteChat, savedChats: savedChats, activeSessionId: chatHistory.id, onAbort: handleAbort, onMermaidTabClick: handleMermaidTabClick, onAiRepairClick: handleAiRepairClick, onDeleteMessage: handleDeleteMessage, onInsertMessage: handleInsertMessage, onRetry: handleRetry, onViewAsMermaid: onViewAsMermaid, renderWarning: renderWarning, renderWelcomeScreen: renderWelcomeScreen }), showPreview && ((0, jsx_runtime_1.jsx)(TTDPreviewPanel_1.TTDPreviewPanel, { canvasRef: canvasRef, hideErrorDetails: lastAssistantMessage?.errorType === "parse", error: error, loaded: mermaidToExcalidrawLib.loaded, onInsert: handleInsertToEditor }))] }));
};
const TextToDiagram = ({ mermaidToExcalidrawLib, onTextSubmit, renderWelcomeScreen, renderWarning, persistenceAdapter, }) => {
    return ((0, jsx_runtime_1.jsx)(TextToDiagramContent, { mermaidToExcalidrawLib: mermaidToExcalidrawLib, onTextSubmit: onTextSubmit, renderWelcomeScreen: renderWelcomeScreen, renderWarning: renderWarning, persistenceAdapter: persistenceAdapter }));
};
exports.TextToDiagram = TextToDiagram;
exports.default = exports.TextToDiagram;
