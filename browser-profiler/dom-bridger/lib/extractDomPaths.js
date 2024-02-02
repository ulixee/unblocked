"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPathsFromDom = void 0;
function extractPathsFromDom(dom, basePath = '', paths = []) {
    let hasChildren = false;
    for (const key of Object.keys(dom)) {
        const path = basePath ? `${basePath}.${key}` : key;
        const value = dom[key];
        if (typeof value === 'object' && !key.startsWith('_$')) {
            paths = extractPathsFromDom(value, path, paths);
            hasChildren = true;
        }
        else {
            paths.push(path);
        }
    }
    if (!hasChildren) {
        paths.push(basePath);
    }
    return paths;
}
exports.extractPathsFromDom = extractPathsFromDom;
//# sourceMappingURL=extractDomPaths.js.map