"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function configureSessionTls(emulationProfile, settings) {
    const { browserName, browserVersion } = emulationProfile.userAgentOption;
    settings.tlsClientHelloId = `${browserName}-${browserVersion.major}`;
}
exports.default = configureSessionTls;
//# sourceMappingURL=configureSessionTls.js.map