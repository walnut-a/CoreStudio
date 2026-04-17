"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.temporarilyDisableTextEditorBlur = exports.useTextEditorFocus = exports.withCaretPositionPreservation = exports.restoreCaretPosition = exports.saveCaretPosition = void 0;
const react_1 = require("react");
// Utility function to get text editor element
const getTextEditor = () => {
    return document.querySelector(".excalidraw-wysiwyg");
};
// Utility functions for caret position management
const saveCaretPosition = () => {
    const textEditor = getTextEditor();
    if (textEditor) {
        return {
            start: textEditor.selectionStart,
            end: textEditor.selectionEnd,
        };
    }
    return null;
};
exports.saveCaretPosition = saveCaretPosition;
const restoreCaretPosition = (position) => {
    setTimeout(() => {
        const textEditor = getTextEditor();
        if (textEditor) {
            textEditor.focus();
            if (position) {
                textEditor.selectionStart = position.start;
                textEditor.selectionEnd = position.end;
            }
        }
    }, 0);
};
exports.restoreCaretPosition = restoreCaretPosition;
const withCaretPositionPreservation = (callback, isCompactMode, isEditingText, onPreventClose) => {
    // Prevent popover from closing in compact mode
    if (isCompactMode && onPreventClose) {
        onPreventClose();
    }
    // Save caret position if editing text
    const savedPosition = isCompactMode && isEditingText ? (0, exports.saveCaretPosition)() : null;
    // Execute the callback
    callback();
    // Restore caret position if needed
    if (isCompactMode && isEditingText) {
        (0, exports.restoreCaretPosition)(savedPosition);
    }
};
exports.withCaretPositionPreservation = withCaretPositionPreservation;
// Hook for managing text editor caret position with state
const useTextEditorFocus = () => {
    const [savedCaretPosition, setSavedCaretPosition] = (0, react_1.useState)(null);
    const saveCaretPositionToState = (0, react_1.useCallback)(() => {
        const position = (0, exports.saveCaretPosition)();
        setSavedCaretPosition(position);
    }, []);
    const restoreCaretPositionFromState = (0, react_1.useCallback)(() => {
        setTimeout(() => {
            const textEditor = getTextEditor();
            if (textEditor) {
                textEditor.focus();
                if (savedCaretPosition) {
                    textEditor.selectionStart = savedCaretPosition.start;
                    textEditor.selectionEnd = savedCaretPosition.end;
                    setSavedCaretPosition(null);
                }
            }
        }, 0);
    }, [savedCaretPosition]);
    const clearSavedPosition = (0, react_1.useCallback)(() => {
        setSavedCaretPosition(null);
    }, []);
    return {
        saveCaretPosition: saveCaretPositionToState,
        restoreCaretPosition: restoreCaretPositionFromState,
        clearSavedPosition,
        hasSavedPosition: !!savedCaretPosition,
    };
};
exports.useTextEditorFocus = useTextEditorFocus;
// Utility function to temporarily disable text editor blur
const temporarilyDisableTextEditorBlur = (duration = 100) => {
    const textEditor = getTextEditor();
    if (textEditor) {
        const originalOnBlur = textEditor.onblur;
        textEditor.onblur = null;
        setTimeout(() => {
            textEditor.onblur = originalOnBlur;
        }, duration);
    }
};
exports.temporarilyDisableTextEditorBlur = temporarilyDisableTextEditorBlur;
