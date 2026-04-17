"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTextEditor = exports.getTextEditor = exports.TEXT_EDITOR_SELECTOR = void 0;
const dom_1 = require("@testing-library/dom");
const react_1 = require("@testing-library/react");
const test_utils_1 = require("../test-utils");
exports.TEXT_EDITOR_SELECTOR = ".excalidraw-textEditorContainer > textarea";
const getTextEditor = async ({ selector = exports.TEXT_EDITOR_SELECTOR, waitForEditor = true, } = {}) => {
    const error = (0, test_utils_1.trimErrorStack)(new Error());
    try {
        const query = () => document.querySelector(selector);
        if (waitForEditor) {
            await (0, dom_1.waitFor)(() => expect(query()).not.toBe(null));
            return query();
        }
        return query();
    }
    catch (err) {
        (0, test_utils_1.stripIgnoredNodesFromErrorMessage)(err);
        err.stack = error.stack;
        throw err;
    }
};
exports.getTextEditor = getTextEditor;
const updateTextEditor = (editor, value) => {
    react_1.fireEvent.change(editor, { target: { value } });
    react_1.fireEvent.input(editor);
};
exports.updateTextEditor = updateTextEditor;
