"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCreatePortalContainer = void 0;
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const App_1 = require("../components/App");
const ui_appState_1 = require("../context/ui-appState");
const useCreatePortalContainer = (opts) => {
    const [div, setDiv] = (0, react_1.useState)(null);
    const editorInterface = (0, App_1.useEditorInterface)();
    const { theme } = (0, ui_appState_1.useUIAppState)();
    const { container: excalidrawContainer } = (0, App_1.useExcalidrawContainer)();
    (0, react_1.useLayoutEffect)(() => {
        if (div) {
            div.className = "";
            div.classList.add("excalidraw", ...(opts?.className?.split(/\s+/) || []));
            div.classList.toggle("excalidraw--mobile", editorInterface.formFactor === "phone");
            div.classList.toggle("theme--dark", theme === common_1.THEME.DARK);
        }
    }, [div, theme, editorInterface.formFactor, opts?.className]);
    (0, react_1.useLayoutEffect)(() => {
        const container = opts?.parentSelector
            ? excalidrawContainer?.querySelector(opts.parentSelector)
            : document.body;
        if (!container) {
            return;
        }
        const div = document.createElement("div");
        container.appendChild(div);
        setDiv(div);
        return () => {
            container.removeChild(div);
        };
    }, [excalidrawContainer, opts?.parentSelector]);
    return div;
};
exports.useCreatePortalContainer = useCreatePortalContainer;
