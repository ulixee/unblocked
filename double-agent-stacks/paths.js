"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalDataPath = exports.getExternalDataPath = exports.localDataDir = exports.externalDataDir = exports.dataDir = void 0;
const Path = require("path");
const Paths = require("./paths.json");
exports.dataDir = Path.resolve(__dirname, Paths.data);
exports.externalDataDir = Path.join(exports.dataDir, 'external');
exports.localDataDir = Path.join(exports.dataDir, 'local');
function getExternalDataPath(path) {
    return Path.join(exports.externalDataDir, path);
}
exports.getExternalDataPath = getExternalDataPath;
function getLocalDataPath(path) {
    return Path.join(exports.localDataDir, path);
}
exports.getLocalDataPath = getLocalDataPath;
//# sourceMappingURL=paths.js.map