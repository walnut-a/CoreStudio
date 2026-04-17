"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Section = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const i18n_1 = require("../i18n");
const App_1 = require("./App");
const Section = ({ heading, children, ...props }) => {
    const { id } = (0, App_1.useExcalidrawContainer)();
    const header = ((0, jsx_runtime_1.jsx)("h2", { className: "visually-hidden", id: `${id}-${heading}-title`, children: (0, i18n_1.t)(`headings.${heading}`) }));
    return ((0, jsx_runtime_1.jsx)("section", { ...props, "aria-labelledby": `${id}-${heading}-title`, children: typeof children === "function" ? (children(header)) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [header, children] })) }));
};
exports.Section = Section;
