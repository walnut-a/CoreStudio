"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptData = exports.encryptData = exports.getCryptoKey = exports.generateEncryptionKey = exports.createIV = exports.IV_LENGTH_BYTES = void 0;
const common_1 = require("@excalidraw/common");
const blob_1 = require("./blob");
exports.IV_LENGTH_BYTES = 12;
const createIV = () => {
    const arr = new Uint8Array(exports.IV_LENGTH_BYTES);
    return window.crypto.getRandomValues(arr);
};
exports.createIV = createIV;
const generateEncryptionKey = async (returnAs) => {
    const key = await window.crypto.subtle.generateKey({
        name: "AES-GCM",
        length: common_1.ENCRYPTION_KEY_BITS,
    }, true, // extractable
    ["encrypt", "decrypt"]);
    return (returnAs === "cryptoKey"
        ? key
        : (await window.crypto.subtle.exportKey("jwk", key)).k);
};
exports.generateEncryptionKey = generateEncryptionKey;
const getCryptoKey = (key, usage) => window.crypto.subtle.importKey("jwk", {
    alg: "A128GCM",
    ext: true,
    k: key,
    key_ops: ["encrypt", "decrypt"],
    kty: "oct",
}, {
    name: "AES-GCM",
    length: common_1.ENCRYPTION_KEY_BITS,
}, false, // extractable
[usage]);
exports.getCryptoKey = getCryptoKey;
const encryptData = async (key, data) => {
    const importedKey = typeof key === "string" ? await (0, exports.getCryptoKey)(key, "encrypt") : key;
    const iv = (0, exports.createIV)();
    const buffer = typeof data === "string"
        ? new TextEncoder().encode(data)
        : data instanceof Uint8Array
            ? data
            : data instanceof Blob
                ? await (0, blob_1.blobToArrayBuffer)(data)
                : data;
    // We use symmetric encryption. AES-GCM is the recommended algorithm and
    // includes checks that the ciphertext has not been modified by an attacker.
    const encryptedBuffer = await window.crypto.subtle.encrypt({
        name: "AES-GCM",
        iv,
    }, importedKey, buffer);
    return { encryptedBuffer, iv };
};
exports.encryptData = encryptData;
const decryptData = async (iv, encrypted, privateKey) => {
    const key = await (0, exports.getCryptoKey)(privateKey, "decrypt");
    return window.crypto.subtle.decrypt({
        name: "AES-GCM",
        iv,
    }, key, encrypted);
};
exports.decryptData = decryptData;
