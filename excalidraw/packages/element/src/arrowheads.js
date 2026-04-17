"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArrowheadForPicker = exports.normalizeArrowhead = void 0;
const normalizeArrowhead = (arrowhead) => {
    switch (arrowhead) {
        case undefined:
        case null:
            return null;
        case "dot":
            return "circle";
        case "crowfoot_one":
            return "cardinality_one";
        case "crowfoot_many":
            return "cardinality_many";
        case "crowfoot_one_or_many":
            return "cardinality_one_or_many";
        default:
            return arrowhead;
    }
};
exports.normalizeArrowhead = normalizeArrowhead;
const getArrowheadForPicker = (arrowhead) => {
    const normalizedArrowhead = (0, exports.normalizeArrowhead)(arrowhead);
    if (normalizedArrowhead === null) {
        return null;
    }
    return normalizedArrowhead;
};
exports.getArrowheadForPicker = getArrowheadForPicker;
