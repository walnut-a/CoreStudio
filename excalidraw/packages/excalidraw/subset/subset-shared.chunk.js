"use strict";
/**
 * DON'T depend on anything from the outside like `promiseTry`, as this module is part of a separate lazy-loaded chunk.
 *
 * Including anything from the main chunk would include the whole chunk by default.
 * Even it it would be tree-shaken during build, it won't be tree-shaken in dev.
 *
 * In the future consider separating common utils into a separate shared chunk.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBase64 = exports.subsetToBinary = exports.subsetToBase64 = exports.Commands = void 0;
const harfbuzz_loader_1 = __importDefault(require("./harfbuzz/harfbuzz-loader"));
const woff2_loader_1 = __importDefault(require("./woff2/woff2-loader"));
/**
 * Shared commands between the main thread and worker threads.
 */
exports.Commands = {
    Subset: "SUBSET",
};
/**
 * Used by browser (main thread), node and jsdom, to subset the font based on the passed codepoints.
 *
 * @returns woff2 font as a base64 encoded string
 */
const subsetToBase64 = async (arrayBuffer, codePoints) => {
    try {
        const buffer = await (0, exports.subsetToBinary)(arrayBuffer, codePoints);
        return (0, exports.toBase64)(buffer);
    }
    catch (e) {
        console.error("Skipped glyph subsetting", e);
        // Fallback to encoding whole font in case of errors
        return (0, exports.toBase64)(arrayBuffer);
    }
};
exports.subsetToBase64 = subsetToBase64;
/**
 * Used by browser (worker thread) and as part of `subsetToBase64`, to subset the font based on the passed codepoints.
 *
 * @eturns woff2 font as an ArrayBuffer, to avoid copying large strings between worker threads and the main thread.
 */
const subsetToBinary = async (arrayBuffer, codePoints) => {
    // lazy loaded wasm modules to avoid multiple initializations in case of concurrent triggers
    // IMPORTANT: could be expensive, as each new worker instance lazy loads these to their own memory ~ keep the # of workes small!
    const { compress, decompress } = await (0, woff2_loader_1.default)();
    const { subset } = await (0, harfbuzz_loader_1.default)();
    const decompressedBinary = decompress(arrayBuffer).buffer;
    const snftSubset = subset(decompressedBinary, new Set(codePoints));
    const compressedBinary = compress(snftSubset.buffer);
    return compressedBinary.buffer;
};
exports.subsetToBinary = subsetToBinary;
/**
 * Util for isomoprhic browser (main thread), node and jsdom usage.
 *
 * Isn't used inside the worker to avoid copying large binary strings (as dataurl) between worker threads and the main thread.
 */
const toBase64 = async (arrayBuffer) => {
    let base64;
    if (typeof Buffer !== "undefined") {
        // node, jsdom
        base64 = Buffer.from(arrayBuffer).toString("base64");
    }
    else {
        // browser (main thread)
        // it's perfectly fine to treat each byte independently,
        // as we care only about turning individual bytes into codepoints,
        // not about multi-byte unicode characters
        const byteString = String.fromCharCode(...new Uint8Array(arrayBuffer));
        base64 = btoa(byteString);
    }
    return `data:font/woff2;base64,${base64}`;
};
exports.toBase64 = toBase64;
