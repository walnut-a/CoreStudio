"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useChatAgent = void 0;
const editor_jotai_1 = require("../../../editor-jotai");
const TTDContext_1 = require("../../TTDDialog/TTDContext");
const chat_1 = require("../../TTDDialog/utils/chat");
const useChatAgent = () => {
    const [chatHistory, setChatHistory] = (0, editor_jotai_1.useAtom)(TTDContext_1.chatHistoryAtom);
    const addUserMessage = (content) => {
        setChatHistory((prev) => (0, chat_1.addMessages)(prev, [
            {
                type: "user",
                content,
            },
        ]));
    };
    const addAssistantMessage = () => {
        setChatHistory((prev) => (0, chat_1.addMessages)(prev, [
            {
                type: "assistant",
                content: "",
                isGenerating: true,
            },
        ]));
    };
    const setLastRetryAttempt = () => {
        setChatHistory((prev) => (0, chat_1.updateAssistantContent)(prev, {
            lastAttemptAt: Date.now(),
        }));
    };
    const setAssistantError = (errorMessage, errorType = "other", errorDetails) => {
        const serializedErrorDetails = errorDetails
            ? JSON.stringify({
                name: errorDetails instanceof Error ? errorDetails.name : "Error",
                message: errorDetails instanceof Error
                    ? errorDetails.message
                    : String(errorDetails),
                stack: errorDetails instanceof Error ? errorDetails.stack : undefined,
            })
            : undefined;
        setChatHistory((prev) => (0, chat_1.updateAssistantContent)(prev, {
            isGenerating: false,
            error: errorMessage,
            errorType,
            errorDetails: serializedErrorDetails,
        }));
    };
    return {
        addUserMessage,
        addAssistantMessage,
        setAssistantError,
        chatHistory,
        setChatHistory,
        setLastRetryAttempt,
    };
};
exports.useChatAgent = useChatAgent;
