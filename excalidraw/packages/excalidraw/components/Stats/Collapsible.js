"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const InlineIcon_1 = require("../InlineIcon");
const icons_1 = require("../icons");
const Collapsible = ({ label, open, openTrigger, children, className, showCollapsedIcon = true, }) => {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }, className: className, onClick: openTrigger, children: [label, showCollapsedIcon && ((0, jsx_runtime_1.jsx)(InlineIcon_1.InlineIcon, { icon: open ? icons_1.collapseUpIcon : icons_1.collapseDownIcon }))] }), open && ((0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "column" }, children: children }))] }));
};
exports.default = Collapsible;
