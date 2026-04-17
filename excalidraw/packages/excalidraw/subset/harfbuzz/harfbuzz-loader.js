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
const harfbuzz_bindings_1 = __importDefault(require("./harfbuzz-bindings"));
const harfbuzz_wasm_1 = __importDefault(require("./harfbuzz-wasm"));
/**
 * Lazy loads wasm and respective bindings for font subsetting based on the harfbuzzjs.
 */
let loadedWasm = null;
// TODO: consider adding support for fetching the wasm from an URL (external CDN, data URL, etc.)
const load = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const module = await WebAssembly.instantiate(harfbuzz_wasm_1.default);
            const harfbuzzJsWasm = module.instance.exports;
            // @ts-expect-error since `.buffer` is custom prop
            const heapu8 = new Uint8Array(harfbuzzJsWasm.memory.buffer);
            const hbSubset = {
                subset: (fontBuffer, codePoints) => {
                    return harfbuzz_bindings_1.default.subset(harfbuzzJsWasm, heapu8, fontBuffer, codePoints);
                },
            };
            resolve(hbSubset);
        }
        catch (e) {
            reject(e);
        }
    });
};
// lazy load the default export
exports.default = () => {
    if (!loadedWasm) {
        loadedWasm = load();
    }
    return loadedWasm;
};
