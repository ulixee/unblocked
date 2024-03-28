"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function configureHttp2Session(emulationProfile, data, resource, settings) {
    settings.localWindowSize = data.http2Settings.firstFrameWindowSize;
    settings.settings = data.http2Settings.settings;
}
exports.default = configureHttp2Session;
//# sourceMappingURL=configureHttp2Session.js.map