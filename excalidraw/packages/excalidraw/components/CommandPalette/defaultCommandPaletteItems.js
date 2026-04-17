"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleTheme = void 0;
const actions_1 = require("../../actions");
exports.toggleTheme = {
    ...actions_1.actionToggleTheme,
    category: "App",
    label: "Toggle theme",
    perform: ({ actionManager }) => {
        actionManager.executeAction(actions_1.actionToggleTheme, "commandPalette");
    },
};
