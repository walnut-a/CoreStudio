"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useOutsideClick = useOutsideClick;
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
function useOutsideClick(ref, 
/** if performance is of concern, memoize the callback */
callback, 
/**
 * Optional callback which is called on every click.
 *
 * Should return `true` if click should be considered as inside the container,
 * and `false` if it falls outside and should call the `callback`.
 *
 * Returning `true` overrides the default behavior and `callback` won't be
 * called.
 *
 * Returning `undefined` will fallback to the default behavior.
 */
isInside) {
    (0, react_1.useEffect)(() => {
        function onOutsideClick(event) {
            const _event = event;
            if (!ref.current) {
                return;
            }
            const isInsideOverride = isInside?.(_event, ref.current);
            if (isInsideOverride === true) {
                return;
            }
            else if (isInsideOverride === false) {
                return callback(_event);
            }
            // clicked element is in the descenendant of the target container
            if (ref.current.contains(_event.target) ||
                // target is detached from DOM (happens when the element is removed
                // on a pointerup event fired *before* this handler's pointerup is
                // dispatched)
                !document.documentElement.contains(_event.target)) {
                return;
            }
            const isClickOnRadixPortal = _event.target.closest("[data-radix-portal]") ||
                // when radix popup is in "modal" mode, it disables pointer events on
                // the `body` element, so the target element is going to be the `html`
                // (note: this won't work if we selectively re-enable pointer events on
                // specific elements as we do with navbar or excalidraw UI elements)
                (_event.target === document.documentElement &&
                    document.body.style.pointerEvents === "none");
            // if clicking on radix portal, assume it's a popup that
            // should be considered as part of the UI. Obviously this is a terrible
            // hack you can end up click on radix popups that outside the tree,
            // but it works for most cases and the downside is minimal for now
            if (isClickOnRadixPortal) {
                return;
            }
            // clicking on a container that ignores outside clicks
            if (_event.target.closest("[data-prevent-outside-click]")) {
                return;
            }
            callback(_event);
        }
        // note: don't use `click` because it often reports incorrect `event.target`
        document.addEventListener(common_1.EVENT.POINTER_DOWN, onOutsideClick);
        document.addEventListener(common_1.EVENT.TOUCH_START, onOutsideClick);
        return () => {
            document.removeEventListener(common_1.EVENT.POINTER_DOWN, onOutsideClick);
            document.removeEventListener(common_1.EVENT.TOUCH_START, onOutsideClick);
        };
    }, [ref, callback, isInside]);
}
