"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTDWelcomeMessage = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const i18n_1 = require("../../i18n");
const TTDWelcomeMessage = () => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "chat-interface__welcome-screen__welcome-message", children: [(0, jsx_runtime_1.jsx)("h3", { children: (0, i18n_1.t)("chat.placeholder.title") }), (0, jsx_runtime_1.jsx)("p", { children: (0, i18n_1.t)("chat.placeholder.description") }), (0, jsx_runtime_1.jsx)("p", { children: (0, i18n_1.t)("chat.placeholder.hint") })] }));
};
exports.TTDWelcomeMessage = TTDWelcomeMessage;
