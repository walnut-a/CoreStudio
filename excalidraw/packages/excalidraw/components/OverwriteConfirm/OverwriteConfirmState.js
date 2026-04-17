"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overwriteConfirmStateAtom = void 0;
exports.openConfirmModal = openConfirmModal;
const editor_jotai_1 = require("../../editor-jotai");
exports.overwriteConfirmStateAtom = (0, editor_jotai_1.atom)({
    active: false,
});
async function openConfirmModal({ title, description, actionLabel, color, }) {
    return new Promise((resolve) => {
        editor_jotai_1.editorJotaiStore.set(exports.overwriteConfirmStateAtom, {
            active: true,
            onConfirm: () => resolve(true),
            onClose: () => resolve(false),
            onReject: () => resolve(false),
            title,
            description,
            actionLabel,
            color,
        });
    });
}
