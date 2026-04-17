"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useScrollPosition = void 0;
const lodash_throttle_1 = __importDefault(require("lodash.throttle"));
const react_1 = require("react");
const editor_jotai_1 = require("../editor-jotai");
const scrollPositionAtom = (0, editor_jotai_1.atom)(0);
const useScrollPosition = (elementRef) => {
    const [scrollPosition, setScrollPosition] = (0, editor_jotai_1.useAtom)(scrollPositionAtom);
    (0, react_1.useEffect)(() => {
        const { current: element } = elementRef;
        if (!element) {
            return;
        }
        const handleScroll = (0, lodash_throttle_1.default)(() => {
            const { scrollTop } = element;
            setScrollPosition(scrollTop);
        }, 200);
        element.addEventListener("scroll", handleScroll);
        return () => {
            handleScroll.cancel();
            element.removeEventListener("scroll", handleScroll);
        };
    }, [elementRef, setScrollPosition]);
    return scrollPosition;
};
exports.useScrollPosition = useScrollPosition;
