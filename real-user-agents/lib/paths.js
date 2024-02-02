"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDataFilePath = exports.dataDir = void 0;
const Path = require("path");
const Paths = require('../paths.json');
exports.dataDir = Path.resolve(__dirname, '..', Paths.data);
function getDataFilePath(path) {
    return Path.join(exports.dataDir, path);
}
exports.getDataFilePath = getDataFilePath;
//# sourceMappingURL=paths.js.map