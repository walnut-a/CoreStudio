"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectName = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const App_1 = require("./App");
require("./TextInput.scss");
require("./ProjectName.scss");
const ProjectName = (props) => {
    const { id } = (0, App_1.useExcalidrawContainer)();
    const [fileName, setFileName] = (0, react_1.useState)(props.value);
    const handleBlur = (event) => {
        if (!props.ignoreFocus) {
            (0, common_1.focusNearestParent)(event.target);
        }
        const value = event.target.value;
        if (value !== props.value) {
            props.onChange(value);
        }
    };
    const handleKeyDown = (event) => {
        if (event.key === common_1.KEYS.ENTER) {
            event.preventDefault();
            if (event.nativeEvent.isComposing || event.keyCode === 229) {
                return;
            }
            event.currentTarget.blur();
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "ProjectName", children: [(0, jsx_runtime_1.jsx)("label", { className: "ProjectName-label", htmlFor: "filename", children: `${props.label}:` }), (0, jsx_runtime_1.jsx)("input", { type: "text", className: "TextInput", onBlur: handleBlur, onKeyDown: handleKeyDown, id: `${id}-filename`, value: fileName, onChange: (event) => setFileName(event.target.value) })] }));
};
exports.ProjectName = ProjectName;
