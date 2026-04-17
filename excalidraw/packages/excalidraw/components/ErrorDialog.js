"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorDialog = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const i18n_1 = require("../i18n");
const App_1 = require("./App");
const Dialog_1 = require("./Dialog");
const ErrorDialog = ({ children, onClose, }) => {
    const [modalIsShown, setModalIsShown] = (0, react_1.useState)(!!children);
    const { container: excalidrawContainer } = (0, App_1.useExcalidrawContainer)();
    const handleClose = react_1.default.useCallback(() => {
        setModalIsShown(false);
        if (onClose) {
            onClose();
        }
        // TODO: Fix the A11y issues so this is never needed since we should always focus on last active element
        excalidrawContainer?.focus();
    }, [onClose, excalidrawContainer]);
    return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: modalIsShown && ((0, jsx_runtime_1.jsx)(Dialog_1.Dialog, { size: "small", onCloseRequest: handleClose, title: (0, i18n_1.t)("errorDialog.title"), children: (0, jsx_runtime_1.jsx)("div", { style: { whiteSpace: "pre-wrap" }, children: children }) })) }));
};
exports.ErrorDialog = ErrorDialog;
