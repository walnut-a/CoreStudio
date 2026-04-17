"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DarkModeToggle = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const common_1 = require("@excalidraw/common");
const i18n_1 = require("../i18n");
const ToolButton_1 = require("./ToolButton");
require("./ToolIcon.scss");
// We chose to use only explicit toggle and not a third option for system value,
// but this could be added in the future.
const DarkModeToggle = (props) => {
    const title = props.title ||
        (props.value === common_1.THEME.DARK
            ? (0, i18n_1.t)("buttons.lightMode")
            : (0, i18n_1.t)("buttons.darkMode"));
    return ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "icon", icon: props.value === common_1.THEME.LIGHT ? ICONS.MOON : ICONS.SUN, title: title, "aria-label": title, onClick: () => props.onChange(props.value === common_1.THEME.DARK ? common_1.THEME.LIGHT : common_1.THEME.DARK), "data-testid": "toggle-dark-mode" }));
};
exports.DarkModeToggle = DarkModeToggle;
const ICONS = {
    SUN: ((0, jsx_runtime_1.jsx)("svg", { width: "512", height: "512", className: "rtl-mirror", viewBox: "0 0 512 512", children: (0, jsx_runtime_1.jsx)("path", { fill: "currentColor", d: "M256 160c-52.9 0-96 43.1-96 96s43.1 96 96 96 96-43.1 96-96-43.1-96-96-96zm246.4 80.5l-94.7-47.3 33.5-100.4c4.5-13.6-8.4-26.5-21.9-21.9l-100.4 33.5-47.4-94.8c-6.4-12.8-24.6-12.8-31 0l-47.3 94.7L92.7 70.8c-13.6-4.5-26.5 8.4-21.9 21.9l33.5 100.4-94.7 47.4c-12.8 6.4-12.8 24.6 0 31l94.7 47.3-33.5 100.5c-4.5 13.6 8.4 26.5 21.9 21.9l100.4-33.5 47.3 94.7c6.4 12.8 24.6 12.8 31 0l47.3-94.7 100.4 33.5c13.6 4.5 26.5-8.4 21.9-21.9l-33.5-100.4 94.7-47.3c13-6.5 13-24.7.2-31.1zm-155.9 106c-49.9 49.9-131.1 49.9-181 0-49.9-49.9-49.9-131.1 0-181 49.9-49.9 131.1-49.9 181 0 49.9 49.9 49.9 131.1 0 181z" }) })),
    MOON: ((0, jsx_runtime_1.jsx)("svg", { width: "512", height: "512", className: "rtl-mirror", viewBox: "0 0 512 512", children: (0, jsx_runtime_1.jsx)("path", { fill: "currentColor", d: "M283.211 512c78.962 0 151.079-35.925 198.857-94.792 7.068-8.708-.639-21.43-11.562-19.35-124.203 23.654-238.262-71.576-238.262-196.954 0-72.222 38.662-138.635 101.498-174.394 9.686-5.512 7.25-20.197-3.756-22.23A258.156 258.156 0 0 0 283.211 0c-141.309 0-256 114.511-256 256 0 141.309 114.511 256 256 256z" }) })),
};
