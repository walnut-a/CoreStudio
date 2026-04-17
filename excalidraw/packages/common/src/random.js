"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomId = exports.reseed = exports.randomInteger = void 0;
const nanoid_1 = require("nanoid");
const math_1 = require("roughjs/bin/math");
const utils_1 = require("./utils");
let random = new math_1.Random(Date.now());
let testIdBase = 0;
const randomInteger = () => Math.floor(random.next() * 2 ** 31);
exports.randomInteger = randomInteger;
const reseed = (seed) => {
    random = new math_1.Random(seed);
    testIdBase = 0;
};
exports.reseed = reseed;
const randomId = () => ((0, utils_1.isTestEnv)() ? `id${testIdBase++}` : (0, nanoid_1.nanoid)());
exports.randomId = randomId;
