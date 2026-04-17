"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryMenuSection = exports.LibraryMenuSectionGrid = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const useTransition_1 = require("../hooks/useTransition");
const LibraryUnit_1 = require("./LibraryUnit");
const LibraryMenuSectionGrid = ({ children, }) => {
    return (0, jsx_runtime_1.jsx)("div", { className: "library-menu-items-container__grid", children: children });
};
exports.LibraryMenuSectionGrid = LibraryMenuSectionGrid;
exports.LibraryMenuSection = (0, react_1.memo)(({ items, onItemSelectToggle, onItemDrag, isItemSelected, onClick, svgCache, itemsRenderedPerBatch, }) => {
    const [, startTransition] = (0, useTransition_1.useTransition)();
    const [index, setIndex] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        if (index < items.length) {
            startTransition(() => {
                setIndex(index + itemsRenderedPerBatch);
            });
        }
    }, [index, items.length, startTransition, itemsRenderedPerBatch]);
    return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: items.map((item, i) => {
            return i < index ? ((0, jsx_runtime_1.jsx)(LibraryUnit_1.LibraryUnit, { elements: item?.elements, isPending: !item?.id && !!item?.elements, onClick: onClick, svgCache: svgCache, id: item?.id, selected: isItemSelected(item.id), onToggle: onItemSelectToggle, onDrag: onItemDrag }, item?.id ?? i)) : ((0, jsx_runtime_1.jsx)(LibraryUnit_1.EmptyLibraryUnit, {}, i));
        }) }));
});
