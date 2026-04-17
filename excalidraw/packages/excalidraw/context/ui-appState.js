"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useUIAppState = exports.UIAppStateContext = void 0;
const react_1 = __importDefault(require("react"));
exports.UIAppStateContext = react_1.default.createContext(null);
const useUIAppState = () => react_1.default.useContext(exports.UIAppStateContext);
exports.useUIAppState = useUIAppState;
