"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditorLocalStorage = void 0;
class EditorLocalStorage {
    static has(key) {
        try {
            return !!window.localStorage.getItem(key);
        }
        catch (error) {
            console.warn(`localStorage.getItem error: ${error.message}`);
            return false;
        }
    }
    static get(key) {
        try {
            const value = window.localStorage.getItem(key);
            if (value) {
                return JSON.parse(value);
            }
            return null;
        }
        catch (error) {
            console.warn(`localStorage.getItem error: ${error.message}`);
            return null;
        }
    }
    static set = (key, value) => {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
            return true;
        }
        catch (error) {
            console.warn(`localStorage.setItem error: ${error.message}`);
            return false;
        }
    };
    static delete = (name) => {
        try {
            window.localStorage.removeItem(name);
        }
        catch (error) {
            console.warn(`localStorage.removeItem error: ${error.message}`);
        }
    };
}
exports.EditorLocalStorage = EditorLocalStorage;
