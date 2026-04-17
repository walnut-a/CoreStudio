"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editorJotaiStore = exports.EditorJotaiProvider = exports.useStore = exports.useAtomValue = exports.useSetAtom = exports.useAtom = exports.atom = void 0;
// eslint-disable-next-line no-restricted-imports
const jotai_1 = require("jotai");
Object.defineProperty(exports, "atom", { enumerable: true, get: function () { return jotai_1.atom; } });
const jotai_scope_1 = require("jotai-scope");
const jotai = (0, jotai_scope_1.createIsolation)();
exports.useAtom = jotai.useAtom, exports.useSetAtom = jotai.useSetAtom, exports.useAtomValue = jotai.useAtomValue, exports.useStore = jotai.useStore;
exports.EditorJotaiProvider = jotai.Provider;
exports.editorJotaiStore = (0, jotai_1.createStore)();
