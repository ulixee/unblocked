"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typedArgs = args;
const { audioCodecs, videoCodecs } = typedArgs;
if ('RTCRtpSender' in self && RTCRtpSender.prototype) {
    replaceFunction(RTCRtpSender, 'getCapabilities', function (target, thisArg, argArray) {
        const kind = argArray && argArray.length ? argArray[0] : null;
        const args = kind ? [kind] : undefined;
        const capabilities = target.apply(thisArg, args);
        if (kind === 'audio')
            capabilities.codecs = audioCodecs;
        if (kind === 'video')
            capabilities.codecs = videoCodecs;
        return capabilities;
    });
}
