"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTextGeneration = void 0;
const react_1 = require("react");
const mermaid_to_excalidraw_1 = require("@excalidraw/mermaid-to-excalidraw");
const math_1 = require("@excalidraw/math");
const editor_jotai_1 = require("../../../editor-jotai");
const analytics_1 = require("../../../analytics");
const i18n_1 = require("../../../i18n");
const TTDContext_1 = require("../TTDContext");
const Chat_1 = require("../Chat");
const chat_1 = require("../utils/chat");
const MIN_PROMPT_LENGTH = 3;
const MAX_PROMPT_LENGTH = 10000;
const useTextGeneration = ({ onTextSubmit, }) => {
    const [, setError] = (0, editor_jotai_1.useAtom)(TTDContext_1.errorAtom);
    const [rateLimits, setRateLimits] = (0, editor_jotai_1.useAtom)(TTDContext_1.rateLimitsAtom);
    const [chatHistory, setChatHistory] = (0, editor_jotai_1.useAtom)(TTDContext_1.chatHistoryAtom);
    const { addUserMessage, addAssistantMessage, setAssistantError } = (0, Chat_1.useChatAgent)();
    const streamingAbortControllerRef = (0, react_1.useRef)(null);
    const validatePrompt = (prompt) => {
        if (prompt.length > MAX_PROMPT_LENGTH ||
            prompt.length < MIN_PROMPT_LENGTH ||
            rateLimits?.rateLimitRemaining === 0) {
            if (prompt.length < MIN_PROMPT_LENGTH) {
                setError(new Error((0, i18n_1.t)("chat.errors.promptTooShort", { min: MIN_PROMPT_LENGTH })));
            }
            if (prompt.length > MAX_PROMPT_LENGTH) {
                setError(new Error((0, i18n_1.t)("chat.errors.promptTooLong", { max: MAX_PROMPT_LENGTH })));
            }
            return false;
        }
        return true;
    };
    const onGenerate = async ({ prompt, isRepairFlow = false, }) => {
        if (!validatePrompt(prompt)) {
            return;
        }
        if (streamingAbortControllerRef.current) {
            streamingAbortControllerRef.current.abort();
        }
        setError(null);
        const abortController = new AbortController();
        streamingAbortControllerRef.current = abortController;
        if (!isRepairFlow) {
            addUserMessage(prompt);
            addAssistantMessage();
        }
        else {
            setChatHistory((prev) => (0, chat_1.updateAssistantContent)(prev, {
                isGenerating: true,
                content: "",
                error: undefined,
                errorType: undefined,
                errorDetails: undefined,
            }));
        }
        try {
            (0, analytics_1.trackEvent)("ai", "generate", "ttd");
            const previousMessages = (0, chat_1.getMessagesForLLM)(chatHistory);
            const messages = [
                ...previousMessages.slice(-3),
                { role: "user", content: prompt },
            ];
            const { generatedResponse, error, rateLimit, rateLimitRemaining } = await onTextSubmit({
                messages,
                onStreamCreated: () => {
                    if (isRepairFlow) {
                        setChatHistory((prev) => (0, chat_1.updateAssistantContent)(prev, {
                            content: "",
                            error: "",
                            isGenerating: true,
                        }));
                    }
                },
                onChunk: (chunk) => {
                    setChatHistory((prev) => {
                        const lastAssistantMessage = (0, chat_1.getLastAssistantMessage)(prev);
                        return (0, chat_1.updateAssistantContent)(prev, {
                            content: lastAssistantMessage.content + chunk,
                        });
                    });
                },
                signal: abortController.signal,
            });
            setChatHistory((prev) => (0, chat_1.updateAssistantContent)(prev, {
                isGenerating: false,
            }));
            if ((0, math_1.isFiniteNumber)(rateLimit) && (0, math_1.isFiniteNumber)(rateLimitRemaining)) {
                setRateLimits({ rateLimit, rateLimitRemaining });
            }
            if (error?.status === 429 || rateLimitRemaining === 0) {
                setChatHistory((chatHistory) => {
                    if (error?.status === 429) {
                        chatHistory = (0, chat_1.removeLastAssistantMessage)(chatHistory);
                    }
                    chatHistory = {
                        ...chatHistory,
                        messages: chatHistory.messages.filter((msg) => msg.type !== "warning" ||
                            msg.warningType === "rateLimitExceeded" ||
                            msg.warningType === "messageLimitExceeded"),
                    };
                    const messages = (0, chat_1.addMessages)(chatHistory, [
                        {
                            type: "warning",
                            warningType: rateLimitRemaining === 0
                                ? "messageLimitExceeded"
                                : "rateLimitExceeded",
                        },
                    ]);
                    return messages;
                });
            }
            if (error) {
                const isAborted = error.name === "AbortError" ||
                    error.message === "Aborted" ||
                    abortController.signal.aborted;
                // do nothing if the request was aborted by the user
                if (isAborted) {
                    return;
                }
                const _error = new Error(error.message || (0, i18n_1.t)("chat.errors.requestFailed"));
                if (error.status !== 429) {
                    setAssistantError(_error.message, "network");
                }
                setError(_error);
                return;
            }
            try {
                await (0, mermaid_to_excalidraw_1.parseMermaidToExcalidraw)(generatedResponse ?? "");
                (0, analytics_1.trackEvent)("ai", "mermaid parse success", "ttd");
            }
            catch (error) {
                (0, analytics_1.trackEvent)("ai", "mermaid parse failed", "ttd");
                const _error = new Error(error.message || (0, i18n_1.t)("chat.errors.mermaidParseError"));
                setAssistantError(_error.message, "parse");
                setError(_error);
            }
        }
        catch (error) {
            const _error = new Error(error.message || (0, i18n_1.t)("chat.errors.generationFailed"));
            setAssistantError(_error.message, "other");
            setError(_error);
        }
        finally {
            streamingAbortControllerRef.current = null;
        }
    };
    const handleAbort = () => {
        if (streamingAbortControllerRef.current) {
            streamingAbortControllerRef.current.abort();
        }
    };
    return {
        onGenerate,
        handleAbort,
    };
};
exports.useTextGeneration = useTextGeneration;
