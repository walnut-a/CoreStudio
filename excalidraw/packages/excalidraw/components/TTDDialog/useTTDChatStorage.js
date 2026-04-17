"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTTDChatStorage = exports.chatsLoadedAtom = exports.isLoadingChatsAtom = exports.savedChatsAtom = void 0;
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const editor_jotai_1 = require("../../editor-jotai");
const TTDContext_1 = require("./TTDContext");
const generateChatTitle = (firstMessage) => {
    const trimmed = firstMessage.trim();
    if (trimmed.length <= 50) {
        return trimmed;
    }
    return `${trimmed.substring(0, 47)}...`;
};
// Shared atom for saved chats - starts empty, populated via onLoadChats
exports.savedChatsAtom = (0, editor_jotai_1.atom)([]);
exports.isLoadingChatsAtom = (0, editor_jotai_1.atom)(false);
exports.chatsLoadedAtom = (0, editor_jotai_1.atom)(false);
const useTTDChatStorage = ({ persistenceAdapter, }) => {
    const [chatHistory] = (0, editor_jotai_1.useAtom)(TTDContext_1.chatHistoryAtom);
    const [savedChats, setSavedChats] = (0, editor_jotai_1.useAtom)(exports.savedChatsAtom);
    const [isLoading, setIsLoading] = (0, editor_jotai_1.useAtom)(exports.isLoadingChatsAtom);
    const [chatsLoaded, setChatsLoaded] = (0, editor_jotai_1.useAtom)(exports.chatsLoadedAtom);
    // Ref to track latest savedChats for async operations
    const savedChatsRef = (0, react_1.useRef)(savedChats);
    savedChatsRef.current = savedChats;
    const lastMessageInHistory = chatHistory?.messages[chatHistory?.messages.length - 1];
    // Load chats on-demand
    const loadChats = (0, react_1.useCallback)(async () => {
        if (chatsLoaded || isLoading) {
            return;
        }
        setIsLoading(true);
        try {
            const chats = await persistenceAdapter.loadChats();
            setSavedChats(chats);
            setChatsLoaded(true);
        }
        catch (error) {
            console.warn("Failed to load chats:", error);
            setSavedChats([]);
            setChatsLoaded(true);
        }
        finally {
            setIsLoading(false);
        }
    }, [
        chatsLoaded,
        isLoading,
        setSavedChats,
        setIsLoading,
        setChatsLoaded,
        persistenceAdapter,
    ]);
    // INITIAL LOAD
    (0, react_1.useEffect)(() => {
        loadChats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const saveCurrentChat = (0, react_1.useCallback)(async () => {
        if (chatHistory.messages.length === 0) {
            return;
        }
        const firstUserMessage = chatHistory.messages.find((msg) => msg.type === "user");
        if (!firstUserMessage || typeof firstUserMessage.content !== "string") {
            return;
        }
        const title = generateChatTitle(firstUserMessage.content);
        const currentSavedChats = savedChatsRef.current;
        const existingChat = currentSavedChats.find((chat) => chat.id === chatHistory.id);
        const messagesChanged = !existingChat ||
            existingChat.messages.length !== chatHistory.messages.length ||
            existingChat.messages.some((msg, i) => msg.id !== chatHistory.messages[i]?.id ||
                msg.content !== chatHistory.messages[i]?.content);
        const chatToSave = {
            id: chatHistory.id,
            title,
            messages: chatHistory.messages
                .filter((msg) => msg.type === "user" || msg.type === "assistant")
                .map((msg) => ({
                ...msg,
                timestamp: msg.timestamp instanceof Date
                    ? msg.timestamp
                    : new Date(msg.timestamp),
            })),
            currentPrompt: chatHistory.currentPrompt,
            timestamp: messagesChanged
                ? Date.now()
                : existingChat?.timestamp ?? Date.now(),
        };
        const updatedChats = [
            ...currentSavedChats.filter((chat) => chat.id !== chatHistory.id),
            chatToSave,
        ]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);
        setSavedChats(updatedChats);
        try {
            await persistenceAdapter.saveChats(updatedChats);
        }
        catch (error) {
            console.warn("Failed to save chats:", error);
        }
    }, [chatHistory, setSavedChats, persistenceAdapter]);
    // Auto-save when generation completes
    (0, react_1.useEffect)(() => {
        if (!lastMessageInHistory?.isGenerating) {
            saveCurrentChat();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        chatHistory.messages?.length,
        lastMessageInHistory?.id,
        lastMessageInHistory?.isGenerating,
    ]);
    const deleteChat = (0, react_1.useCallback)(async (chatId) => {
        const updatedChats = savedChatsRef.current.filter((chat) => chat.id !== chatId);
        setSavedChats(updatedChats);
        try {
            await persistenceAdapter.saveChats(updatedChats);
        }
        catch (error) {
            console.warn("Failed to save after delete:", error);
        }
        return updatedChats;
    }, [setSavedChats, persistenceAdapter]);
    const restoreChat = (0, react_1.useCallback)((chat) => {
        // Save is handled by the caller after state update
        return chat;
    }, []);
    const createNewChatId = (0, react_1.useCallback)(async () => {
        await saveCurrentChat();
        return (0, common_1.randomId)();
    }, [saveCurrentChat]);
    return {
        savedChats,
        saveCurrentChat,
        deleteChat,
        restoreChat,
        createNewChatId,
    };
};
exports.useTTDChatStorage = useTTDChatStorage;
