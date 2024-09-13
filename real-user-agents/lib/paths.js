"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataDir = void 0;
exports.getDataFilePath = getDataFilePath;
const Path = require("path");
const Paths = require('../paths.json');
exports.dataDir = Path.resolve(__dirname, '..', Paths.data);
function getDataFilePath(path) {
    return Path.join(exports.dataDir, path);
}
//# sourceMappingURL=paths.js.map