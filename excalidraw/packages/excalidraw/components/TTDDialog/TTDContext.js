"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatHistoryAtom = exports.errorAtom = exports.showPreviewAtom = exports.rateLimitsAtom = void 0;
const common_1 = require("@excalidraw/common");
const editor_jotai_1 = require("../../editor-jotai");
exports.rateLimitsAtom = (0, editor_jotai_1.atom)(null);
exports.showPreviewAtom = (0, editor_jotai_1.atom)(false);
exports.errorAtom = (0, editor_jotai_1.atom)(null);
exports.chatHistoryAtom = (0, editor_jotai_1.atom)({
    id: (0, common_1.randomId)(),
    messages: [],
    currentPrompt: "",
});
