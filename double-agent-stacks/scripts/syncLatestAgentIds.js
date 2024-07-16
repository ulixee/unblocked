"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@ulixee/commons/lib/SourceMapSupport");
const stableChromeVersions = require("@ulixee/real-user-agents/data/stableChromeVersions.json");
const Fs = require("fs");
const paths_1 = require("../paths");
const agents = {
    browserIds: stableChromeVersions.slice(0, 2).map(x => x.id),
};
Fs.writeFileSync((0, paths_1.getExternalDataPath)('userAgentConfig.json'), JSON.stringify(agents, null, 2));
//# sourceMappingURL=syncLatestAgentIds.js.map