const { supportedCodecs } = args;
if ('MediaRecorder' in self) {
    proxyFunction(self.MediaRecorder, 'isTypeSupported', (func, thisArg, [type]) => {
        if (type === undefined)
            return ProxyOverride.callOriginal;
        return supportedCodecs.includes(type);
    });
}
