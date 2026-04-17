"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withInternalFallback = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const tunnels_1 = require("../../context/tunnels");
const editor_jotai_1 = require("../../editor-jotai");
const withInternalFallback = (componentName, Component) => {
    const renderAtom = (0, editor_jotai_1.atom)(0);
    const WrapperComponent = (props) => {
        const { tunnelsJotai: { useAtom }, } = (0, tunnels_1.useTunnels)();
        // for rerenders
        const [, setCounter] = useAtom(renderAtom);
        // for initial & subsequent renders. Tracked as component state
        // due to excalidraw multi-instance scanerios.
        const metaRef = (0, react_1.useRef)({
            // flag set on initial render to tell the fallback component to skip the
            // render until mount counter are initialized. This is because the counter
            // is initialized in an effect, and thus we could end rendering both
            // components at the same time until counter is initialized.
            preferHost: false,
            counter: 0,
        });
        (0, react_1.useLayoutEffect)(() => {
            const meta = metaRef.current;
            setCounter((c) => {
                const next = c + 1;
                meta.counter = next;
                return next;
            });
            return () => {
                setCounter((c) => {
                    const next = c - 1;
                    meta.counter = next;
                    if (!next) {
                        meta.preferHost = false;
                    }
                    return next;
                });
            };
        }, [setCounter]);
        if (!props.__fallback) {
            metaRef.current.preferHost = true;
        }
        // ensure we don't render fallback and host components at the same time
        if (
        // either before the counters are initialized
        (!metaRef.current.counter &&
            props.__fallback &&
            metaRef.current.preferHost) ||
            // or after the counters are initialized, and both are rendered
            // (this is the default when host renders as well)
            (metaRef.current.counter > 1 && props.__fallback)) {
            return null;
        }
        return (0, jsx_runtime_1.jsx)(Component, { ...props });
    };
    WrapperComponent.displayName = componentName;
    return WrapperComponent;
};
exports.withInternalFallback = withInternalFallback;
