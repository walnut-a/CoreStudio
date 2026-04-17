"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tooltip = exports.updateTooltipPosition = exports.getTooltipDiv = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
require("./Tooltip.scss");
const getTooltipDiv = () => {
    const existingDiv = document.querySelector(".excalidraw-tooltip");
    if (existingDiv) {
        return existingDiv;
    }
    const div = document.createElement("div");
    document.body.appendChild(div);
    div.classList.add("excalidraw-tooltip");
    return div;
};
exports.getTooltipDiv = getTooltipDiv;
const updateTooltipPosition = (tooltip, item, position = "bottom") => {
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 5;
    let left = item.left + item.width / 2 - tooltipRect.width / 2;
    if (left < 0) {
        left = margin;
    }
    else if (left + tooltipRect.width >= viewportWidth) {
        left = viewportWidth - tooltipRect.width - margin;
    }
    let top;
    if (position === "bottom") {
        top = item.top + item.height + margin;
        if (top + tooltipRect.height >= viewportHeight) {
            top = item.top - tooltipRect.height - margin;
        }
    }
    else {
        top = item.top - tooltipRect.height - margin;
        if (top < 0) {
            top = item.top + item.height + margin;
        }
    }
    Object.assign(tooltip.style, {
        top: `${top}px`,
        left: `${left}px`,
    });
};
exports.updateTooltipPosition = updateTooltipPosition;
const updateTooltip = (item, tooltip, label, long) => {
    tooltip.classList.add("excalidraw-tooltip--visible");
    tooltip.style.minWidth = long ? "50ch" : "10ch";
    tooltip.style.maxWidth = long ? "50ch" : "15ch";
    tooltip.textContent = label;
    const itemRect = item.getBoundingClientRect();
    (0, exports.updateTooltipPosition)(tooltip, itemRect);
};
const Tooltip = ({ children, label, long = false, style, disabled, }) => {
    (0, react_1.useEffect)(() => {
        return () => (0, exports.getTooltipDiv)().classList.remove("excalidraw-tooltip--visible");
    }, []);
    if (disabled) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "excalidraw-tooltip-wrapper", onPointerEnter: (event) => updateTooltip(event.currentTarget, (0, exports.getTooltipDiv)(), label, long), onPointerLeave: () => (0, exports.getTooltipDiv)().classList.remove("excalidraw-tooltip--visible"), style: style, children: children }));
};
exports.Tooltip = Tooltip;
