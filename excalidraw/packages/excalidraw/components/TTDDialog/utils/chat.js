"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessagesForLLM = exports.removeLastAssistantMessage = exports.addMessages = exports.getLastAssistantMessage = exports.updateAssistantContent = void 0;
const common_1 = require("@excalidraw/common");
const updateAssistantContent = (chatHistory, payload) => {
    const { messages } = chatHistory;
    const lastAssistantIndex = (0, common_1.findLastIndex)(messages, (msg) => msg.type === "assistant");
    if (lastAssistantIndex === -1) {
        return chatHistory;
    }
    const lastMessage = messages[lastAssistantIndex];
    const updatedMessages = messages.slice();
    updatedMessages[lastAssistantIndex] = {
        ...lastMessage,
        ...payload,
    };
    return {
        ...chatHistory,
        messages: updatedMessages,
    };
};
exports.updateAssistantContent = updateAssistantContent;
const getLastAssistantMessage = (chatHistory) => {
    const { messages } = chatHistory;
    const lastAssistantIndex = (0, common_1.findLastIndex)(messages, (msg) => msg.type === "assistant");
    return messages[lastAssistantIndex];
};
exports.getLastAssistantMessage = getLastAssistantMessage;
const addMessages = (chatHistory, messages) => {
    const newMessages = messages.map((message) => ({
        ...message,
        id: (0, common_1.randomId)(),
        timestamp: new Date(),
    }));
    return {
        ...chatHistory,
        messages: [...chatHistory.messages, ...newMessages],
    };
};
exports.addMessages = addMessages;
const removeLastAssistantMessage = (chatHistory) => {
    const lastMsgIdx = (0, common_1.findLastIndex)(chatHistory.messages ?? [], (msg) => msg.type === "assistant");
    if (lastMsgIdx !== -1) {
        return {
            ...chatHistory,
            messages: chatHistory.messages.filter((_, idx) => idx !== lastMsgIdx),
        };
    }
    return chatHistory;
};
exports.removeLastAssistantMessage = removeLastAssistantMessage;
const getMessagesForLLM = (chatHistory) => {
    const messages = [];
    for (const msg of chatHistory.messages) {
        if (msg.content && (msg.type === "user" || msg.type === "assistant")) {
            messages.push({
                role: msg.type,
                content: msg.content,
            });
        }
    }
    return messages;
};
exports.getMessagesForLLM = getMessagesForLLM;
