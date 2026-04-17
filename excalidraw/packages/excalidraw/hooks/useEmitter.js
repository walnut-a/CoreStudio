"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEmitter = void 0;
const react_1 = require("react");
const useEmitter = (emitter, initialState) => {
    const [event, setEvent] = (0, react_1.useState)(initialState);
    (0, react_1.useEffect)(() => {
        const unsubscribe = emitter.on((event) => {
            setEvent(event);
        });
        return () => {
            unsubscribe();
        };
    }, [emitter]);
    return event;
};
exports.useEmitter = useEmitter;
