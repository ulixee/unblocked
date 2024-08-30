"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function configureSessionTls(emulationProfile, settings) {
    const { browserName, browserVersion, string } = emulationProfile.userAgentOption;
    settings.tlsClientHelloId = `${browserName}-${browserVersion.major}`;
    settings.proxyUseragent = string;
}
exports.default = configureSessionTls;
//# sourceMappingURL=configureSessionTls.js.map