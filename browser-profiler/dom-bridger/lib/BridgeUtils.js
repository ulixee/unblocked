"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathIsPatternMatch = exports.extractDirGroupsMap = void 0;
const Fs = require("fs");
const FOLDER_MATCH = /chrome-(8|9|10|11)[0-9]/;
function extractDirGroupsMap(bridge, baseDir) {
    const dirGroupsMap = {};
    for (const source of ['browserstack', 'local']) {
        const dirNames = Fs.readdirSync(`${baseDir}/${source}`).filter(x => x.match(FOLDER_MATCH));
        for (const dirName of dirNames) {
            let [osId, browserId, features] = dirName.split('--'); // eslint-disable-line prefer-const
            const featuresArray = features.replace('selenium', 'devtools').split('-');
            if (bridge.includes(source)) {
                featuresArray.splice(0, 0, source);
            }
            const type = featuresArray.includes(bridge[0]) ? bridge[0] : bridge[1];
            features = featuresArray
                .map(x => (bridge.includes(x) ? `(${bridge.join('|')})` : x))
                .join('-');
            const key = [osId, browserId, features].filter(x => x).join('--');
            dirGroupsMap[key] = dirGroupsMap[key] || {};
            dirGroupsMap[key][type] = `${source}/${dirName}`;
        }
    }
    return dirGroupsMap;
}
exports.extractDirGroupsMap = extractDirGroupsMap;
function pathIsPatternMatch(path, pattern) {
    if (pattern.charAt(0) === '*') {
        return path.includes(pattern.substr(1));
    }
    return path.startsWith(pattern);
}
exports.pathIsPatternMatch = pathIsPatternMatch;
//# sourceMappingURL=BridgeUtils.js.map