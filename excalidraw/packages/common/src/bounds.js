"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBounds = void 0;
const isBounds = (box) => Array.isArray(box) &&
    box.length === 4 &&
    typeof box[0] === "number" &&
    typeof box[1] === "number" &&
    typeof box[2] === "number" &&
    typeof box[3] === "number";
exports.isBounds = isBounds;
