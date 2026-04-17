"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyLibraryUnit = exports.LibraryUnit = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const useLibraryItemSvg_1 = require("../hooks/useLibraryItemSvg");
const App_1 = require("./App");
const CheckboxItem_1 = require("./CheckboxItem");
const icons_1 = require("./icons");
require("./LibraryUnit.scss");
exports.LibraryUnit = (0, react_1.memo)(({ id, elements, isPending, onClick, selected, onToggle, onDrag, svgCache, }) => {
    const ref = (0, react_1.useRef)(null);
    const svg = (0, useLibraryItemSvg_1.useLibraryItemSvg)(id, elements, svgCache, ref);
    const [isHovered, setIsHovered] = (0, react_1.useState)(false);
    const isMobile = (0, App_1.useEditorInterface)().formFactor === "phone";
    const adder = isPending && ((0, jsx_runtime_1.jsx)("div", { className: "library-unit__adder", children: icons_1.PlusIcon }));
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("library-unit", {
            "library-unit__active": elements,
            "library-unit--hover": elements && isHovered,
            "library-unit--selected": selected,
            "library-unit--skeleton": !svg,
        }), onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), children: [(0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("library-unit__dragger", {
                    "library-unit__pulse": !!isPending,
                }), ref: ref, draggable: !!elements, onClick: !!elements || !!isPending
                    ? (event) => {
                        if (id && event.shiftKey) {
                            onToggle(id, event);
                        }
                        else {
                            onClick(id);
                        }
                    }
                    : undefined, onDragStart: (event) => {
                    if (!id) {
                        event.preventDefault();
                        return;
                    }
                    setIsHovered(false);
                    onDrag(id, event);
                } }), adder, id && elements && (isHovered || isMobile || selected) && ((0, jsx_runtime_1.jsx)(CheckboxItem_1.CheckboxItem, { checked: selected, onChange: (checked, event) => onToggle(id, event), className: "library-unit__checkbox" }))] }));
});
const EmptyLibraryUnit = () => ((0, jsx_runtime_1.jsx)("div", { className: "library-unit library-unit--skeleton" }));
exports.EmptyLibraryUnit = EmptyLibraryUnit;
