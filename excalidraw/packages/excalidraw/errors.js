"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestError = exports.ExcalidrawError = exports.WorkerInTheMainChunkError = exports.WorkerUrlNotDefinedError = exports.ImageSceneDataError = exports.AbortError = exports.CanvasError = void 0;
class CanvasError extends Error {
    constructor(message = "Couldn't export canvas.", name = "CANVAS_ERROR") {
        super();
        this.name = name;
        this.message = message;
    }
}
exports.CanvasError = CanvasError;
class AbortError extends DOMException {
    constructor(message = "Request Aborted") {
        super(message, "AbortError");
    }
}
exports.AbortError = AbortError;
class ImageSceneDataError extends Error {
    code;
    constructor(message = "Image Scene Data Error", code = "IMAGE_SCENE_DATA_ERROR") {
        super(message);
        this.name = "EncodingError";
        this.code = code;
    }
}
exports.ImageSceneDataError = ImageSceneDataError;
class WorkerUrlNotDefinedError extends Error {
    code;
    constructor(message = "Worker URL is not defined!", code = "WORKER_URL_NOT_DEFINED") {
        super(message);
        this.name = "WorkerUrlNotDefinedError";
        this.code = code;
    }
}
exports.WorkerUrlNotDefinedError = WorkerUrlNotDefinedError;
class WorkerInTheMainChunkError extends Error {
    code;
    constructor(message = "Worker has to be in a separate chunk!", code = "WORKER_IN_THE_MAIN_CHUNK") {
        super(message);
        this.name = "WorkerInTheMainChunkError";
        this.code = code;
    }
}
exports.WorkerInTheMainChunkError = WorkerInTheMainChunkError;
/**
 * Use this for generic, handled errors, so you can check against them
 * and rethrow if needed
 */
class ExcalidrawError extends Error {
    constructor(message) {
        super(message);
        this.name = "ExcalidrawError";
    }
}
exports.ExcalidrawError = ExcalidrawError;
class RequestError extends Error {
    status;
    data;
    toObject() {
        return { name: this.name, status: this.status, message: this.message };
    }
    constructor({ message = "Something went wrong", status = 500, data, } = {}) {
        super();
        this.name = "RequestError";
        this.message = message;
        this.status = status;
        this.data = data;
    }
}
exports.RequestError = RequestError;
