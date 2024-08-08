"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UserAgentSelector_1 = require("../UserAgentSelector");
function selectUserAgentOption(userAgentSelector, userAgentOptions) {
    userAgentSelector = userAgentSelector?.trim();
    if (userAgentSelector === 'chrome-latest')
        userAgentSelector = '';
    if (!userAgentSelector) {
        return userAgentOptions.getDefaultAgentOption();
    }
    if (userAgentSelector.startsWith('~')) {
        const selectors = new UserAgentSelector_1.default(userAgentSelector);
        const option = userAgentOptions.findWithSelector(selectors);
        if (!option) {
            throw new Error(`No installed UserAgent Emulators match your criteria (${selectors.userAgentSelector})`);
        }
        return option;
    }
    return userAgentOptions.findClosestInstalledToUserAgentString(userAgentSelector);
}
exports.default = selectUserAgentOption;
//# sourceMappingURL=selectUserAgentOption.js.map