"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShortcutKey = void 0;
const common_1 = require("@excalidraw/common");
const i18n_1 = require("./i18n");
const getShortcutKey = (shortcut) => shortcut
    .replace(/\b(Opt(?:ion)?|Alt)\b/i, common_1.isDarwin ? (0, i18n_1.t)("keys.option") : (0, i18n_1.t)("keys.alt"))
    .replace(/\bShift\b/i, (0, i18n_1.t)("keys.shift"))
    .replace(/\b(Enter|Return)\b/i, (0, i18n_1.t)("keys.enter"))
    .replace(/\b(Ctrl|Cmd|Command|CtrlOrCmd)\b/gi, common_1.isDarwin ? (0, i18n_1.t)("keys.cmd") : (0, i18n_1.t)("keys.ctrl"))
    .replace(/\b(Esc(?:ape)?)\b/i, (0, i18n_1.t)("keys.escape"))
    .replace(/\b(Space(?:bar)?)\b/i, (0, i18n_1.t)("keys.spacebar"))
    .replace(/\b(Del(?:ete)?)\b/i, (0, i18n_1.t)("keys.delete"));
exports.getShortcutKey = getShortcutKey;
