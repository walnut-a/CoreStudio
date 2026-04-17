"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = exports.actions = void 0;
exports.actions = [];
const register = (action) => {
    exports.actions = exports.actions.concat(action);
    return action;
};
exports.register = register;
