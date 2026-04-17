"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useChatManagement = void 0;
const react_1 = require("react");
const editor_jotai_1 = require("../../../editor-jotai");
const TTDContext_1 = require("../TTDContext");
const useTTDChatStorage_1 = require("../useTTDChatStorage");
const chat_1 = require("../utils/chat");
const useChatManagement = ({ persistenceAdapter, }) => {
    const setError = (0, editor_jotai_1.useSetAtom)(TTDContext_1.errorAtom);
    const [chatHistory, setChatHistory] = (0, editor_jotai_1.useAtom)(TTDContext_1.chatHistoryAtom);
    const [isMenuOpen, setIsMenuOpen] = (0, react_1.useState)(false);
    const { restoreChat, deleteChat, createNewChatId } = (0, useTTDChatStorage_1.useTTDChatStorage)({
        persistenceAdapter,
    });
    const applyChatToState = (0, react_1.useCallback)((chat) => {
        const restoredMessages = chat.messages.map((msg) => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date
                ? msg.timestamp
                : new Date(msg.timestamp),
        }));
        const history = {
            id: chat.id,
            messages: restoredMessages,
            currentPrompt: "",
        };
        const lastAssistantMsg = (0, chat_1.getLastAssistantMessage)(history);
        setError(lastAssistantMsg?.error ? new Error(lastAssistantMsg?.error) : null);
        setChatHistory(history);
    }, [setError, setChatHistory]);
    const resetChatState = (0, react_1.useCallback)(async () => {
        const newSessionId = await createNewChatId();
        setChatHistory({
            id: newSessionId,
            messages: [],
            currentPrompt: "",
        });
        setError(null);
    }, [createNewChatId, setChatHistory, setError]);
    const onRestoreChat = (0, react_1.useCallback)((chat) => {
        const restoredChat = restoreChat(chat);
        applyChatToState(restoredChat);
        setIsMenuOpen(false);
    }, [restoreChat, applyChatToState]);
    const handleDeleteChat = (0, react_1.useCallback)(async (chatId, event) => {
        event.stopPropagation();
        const isDeletingActiveChat = chatId === chatHistory.id;
        const updatedChats = await deleteChat(chatId);
        if (isDeletingActiveChat) {
            if (updatedChats.length > 0) {
                const nextChat = updatedChats[0];
                applyChatToState(nextChat);
            }
            else {
                await resetChatState();
            }
        }
    }, [chatHistory.id, deleteChat, applyChatToState, resetChatState]);
    const handleNewChat = (0, react_1.useCallback)(async () => {
        await resetChatState();
        setIsMenuOpen(false);
    }, [resetChatState]);
    const handleMenuToggle = (0, react_1.useCallback)(() => {
        setIsMenuOpen((prev) => !prev);
    }, []);
    const handleMenuClose = (0, react_1.useCallback)(() => {
        setIsMenuOpen(false);
    }, []);
    return {
        isMenuOpen,
        onRestoreChat,
        handleDeleteChat,
        handleNewChat,
        handleMenuToggle,
        handleMenuClose,
    };
};
exports.useChatManagement = useChatManagement;
