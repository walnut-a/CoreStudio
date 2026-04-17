"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMermaidRenderer = void 0;
const react_1 = require("react");
const editor_jotai_1 = require("../../../editor-jotai");
const TTDContext_1 = require("../TTDContext");
const common_1 = require("../common");
const mermaidValidation_1 = require("../utils/mermaidValidation");
const chat_1 = require("../utils/chat");
const ui_appState_1 = require("../../../context/ui-appState");
const FAST_THROTTLE_DELAY = 300;
const SLOW_THROTTLE_DELAY = 3000;
const RENDER_SPEED_THRESHOLD = 100;
const PARSE_FAIL_DELAY = 100;
const useMermaidRenderer = ({ mermaidToExcalidrawLib, canvasRef, }) => {
    const [chatHistory] = (0, editor_jotai_1.useAtom)(TTDContext_1.chatHistoryAtom);
    const [, setError] = (0, editor_jotai_1.useAtom)(TTDContext_1.errorAtom);
    const [showPreview, setShowPreview] = (0, editor_jotai_1.useAtom)(TTDContext_1.showPreviewAtom);
    const isRenderingRef = (0, react_1.useRef)(false);
    const lastAssistantMessage = (0, react_1.useMemo)(() => (0, chat_1.getLastAssistantMessage)(chatHistory), [chatHistory]);
    // Keeping lastAssistantMesssage in ref, so I can access it in useEffect hooks
    const lastAssistantMessageRef = (0, react_1.useRef)(lastAssistantMessage);
    (0, react_1.useEffect)(() => {
        lastAssistantMessageRef.current = lastAssistantMessage;
    }, [lastAssistantMessage]);
    const data = (0, react_1.useRef)({
        elements: [],
        files: null,
    });
    const lastRenderTimeRef = (0, react_1.useRef)(0);
    const pendingContentRef = (0, react_1.useRef)(null);
    const hasErrorOffsetRef = (0, react_1.useRef)(false);
    const currentThrottleDelayRef = (0, react_1.useRef)(FAST_THROTTLE_DELAY);
    const { theme } = (0, ui_appState_1.useUIAppState)();
    const renderMermaid = (0, react_1.useCallback)(async (mermaidDefinition) => {
        if (!mermaidDefinition.trim() || !mermaidToExcalidrawLib.loaded) {
            return false;
        }
        if (isRenderingRef.current) {
            return false;
        }
        isRenderingRef.current = true;
        const renderStartTime = performance.now();
        const result = await (0, common_1.convertMermaidToExcalidraw)({
            canvasRef,
            data,
            mermaidToExcalidrawLib,
            setError,
            mermaidDefinition,
            theme,
        });
        const renderDuration = performance.now() - renderStartTime;
        if (renderDuration < RENDER_SPEED_THRESHOLD) {
            currentThrottleDelayRef.current = FAST_THROTTLE_DELAY;
        }
        else {
            currentThrottleDelayRef.current = SLOW_THROTTLE_DELAY;
        }
        isRenderingRef.current = false;
        return result.success;
    }, [canvasRef, mermaidToExcalidrawLib, setError, theme]);
    const throttledRenderMermaid = (0, react_1.useMemo)(() => {
        const fn = async (content) => {
            const now = Date.now();
            const timeSinceLastRender = now - lastRenderTimeRef.current;
            const throttleDelay = currentThrottleDelayRef.current;
            if (!(0, mermaidValidation_1.isValidMermaidSyntax)(content)) {
                if (!hasErrorOffsetRef.current) {
                    lastRenderTimeRef.current = Math.max(lastRenderTimeRef.current, now - throttleDelay + PARSE_FAIL_DELAY);
                    hasErrorOffsetRef.current = true;
                }
                pendingContentRef.current = content;
                return;
            }
            hasErrorOffsetRef.current = false;
            if (timeSinceLastRender < throttleDelay) {
                pendingContentRef.current = content;
                return;
            }
            pendingContentRef.current = null;
            const success = await renderMermaid(content);
            lastRenderTimeRef.current = Date.now();
            if (!success) {
                lastRenderTimeRef.current =
                    lastRenderTimeRef.current - throttleDelay + PARSE_FAIL_DELAY;
                hasErrorOffsetRef.current = true;
            }
        };
        fn.flush = async () => {
            if (pendingContentRef.current) {
                const content = pendingContentRef.current;
                pendingContentRef.current = null;
                await renderMermaid(content);
                lastRenderTimeRef.current = Date.now();
            }
        };
        fn.cancel = () => {
            pendingContentRef.current = null;
        };
        return fn;
    }, [renderMermaid]);
    const resetThrottleState = (0, react_1.useCallback)(() => {
        lastRenderTimeRef.current = 0;
        pendingContentRef.current = null;
        hasErrorOffsetRef.current = false;
        currentThrottleDelayRef.current = FAST_THROTTLE_DELAY;
    }, []);
    // this hook is responsible for keep rendering during streaming
    (0, react_1.useEffect)(() => {
        if (lastAssistantMessage?.content && lastAssistantMessage?.isGenerating) {
            throttledRenderMermaid(lastAssistantMessage.content);
        }
        else if (!lastAssistantMessage?.isGenerating) {
            throttledRenderMermaid.flush();
            resetThrottleState();
            if (lastAssistantMessage?.content) {
                throttledRenderMermaid(lastAssistantMessage.content);
            }
        }
    }, [
        resetThrottleState,
        throttledRenderMermaid,
        lastAssistantMessage?.isGenerating,
        lastAssistantMessage?.content,
    ]);
    // render the last message if the user navigates between the existing chats
    (0, react_1.useEffect)(() => {
        const msg = lastAssistantMessageRef.current;
        if (!msg?.content || msg.error) {
            return;
        }
        if (!showPreview) {
            return;
        }
        renderMermaid(msg.content);
    }, [chatHistory?.id, renderMermaid, showPreview]);
    (0, react_1.useEffect)(() => {
        if (!chatHistory.messages?.filter((msg) => msg.type === "assistant").length) {
            const canvasNode = canvasRef.current;
            if (canvasNode) {
                const parent = canvasNode.parentElement;
                if (parent) {
                    parent.style.background = "";
                    canvasNode.replaceChildren();
                }
            }
            setShowPreview(false);
        }
        else if (!showPreview) {
            setShowPreview(true);
        }
    }, [chatHistory.messages, setShowPreview, canvasRef, showPreview]);
    return {
        data,
    };
};
exports.useMermaidRenderer = useMermaidRenderer;
