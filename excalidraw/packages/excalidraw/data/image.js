"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodePngMetadata = exports.encodePngMetadata = exports.getTEXtChunk = void 0;
const png_chunk_text_1 = __importDefault(require("png-chunk-text"));
const png_chunks_encode_1 = __importDefault(require("png-chunks-encode"));
const png_chunks_extract_1 = __importDefault(require("png-chunks-extract"));
const common_1 = require("@excalidraw/common");
const blob_1 = require("./blob");
const encode_1 = require("./encode");
// -----------------------------------------------------------------------------
// PNG
// -----------------------------------------------------------------------------
const getTEXtChunk = async (blob) => {
    const chunks = (0, png_chunks_extract_1.default)(new Uint8Array(await (0, blob_1.blobToArrayBuffer)(blob)));
    const metadataChunk = chunks.find((chunk) => chunk.name === "tEXt");
    if (metadataChunk) {
        return png_chunk_text_1.default.decode(metadataChunk.data);
    }
    return null;
};
exports.getTEXtChunk = getTEXtChunk;
const encodePngMetadata = async ({ blob, metadata, }) => {
    const chunks = (0, png_chunks_extract_1.default)(new Uint8Array(await (0, blob_1.blobToArrayBuffer)(blob)));
    const metadataChunk = png_chunk_text_1.default.encode(common_1.MIME_TYPES.excalidraw, JSON.stringify((0, encode_1.encode)({
        text: metadata,
        compress: true,
    })));
    // insert metadata before last chunk (iEND)
    chunks.splice(-1, 0, metadataChunk);
    return new Blob([(0, png_chunks_encode_1.default)(chunks)], { type: common_1.MIME_TYPES.png });
};
exports.encodePngMetadata = encodePngMetadata;
const decodePngMetadata = async (blob) => {
    const metadata = await (0, exports.getTEXtChunk)(blob);
    if (metadata?.keyword === common_1.MIME_TYPES.excalidraw) {
        try {
            const encodedData = JSON.parse(metadata.text);
            if (!("encoded" in encodedData)) {
                // legacy, un-encoded scene JSON
                if ("type" in encodedData &&
                    encodedData.type === common_1.EXPORT_DATA_TYPES.excalidraw) {
                    return metadata.text;
                }
                throw new Error("FAILED");
            }
            return (0, encode_1.decode)(encodedData);
        }
        catch (error) {
            console.error(error);
            throw new Error("FAILED");
        }
    }
    throw new Error("INVALID");
};
exports.decodePngMetadata = decodePngMetadata;
