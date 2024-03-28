if ('WorkerGlobalScope' in self ||
    self.location.protocol === 'https:' ||
    'deviceMemory' in navigator) {
    proxyGetter(self.navigator, 'deviceMemory', () => args.memory, true);
}
if ('WorkerGlobalScope' in self || self.location.protocol === 'https:') {
    if ('storage' in navigator && navigator.storage && args.storageTib) {
        proxyFunction(self.navigator.storage, 'estimate', async (target, thisArg, argArray) => {
            const result = await ReflectCached.apply(target, thisArg, argArray);
            result.quota = Math.round(args.storageTib * 1024 * 1024 * 1024 * 1024 * 0.5);
            return result;
        }, true);
    }
    if ('webkitTemporaryStorage' in navigator &&
        'queryUsageAndQuota' in navigator.webkitTemporaryStorage &&
        args.storageTib) {
        proxyFunction(self.navigator.webkitTemporaryStorage, 'queryUsageAndQuota', (target, thisArg, argArray) => {
            return ReflectCached.apply(target, thisArg, [
                usage => {
                    argArray[0](usage, Math.round(args.storageTib * 1024 * 1024 * 1024 * 1024 * 0.5));
                },
            ]);
        }, true);
    }
    if ('memory' in performance && performance.memory) {
        proxyGetter(self.performance, 'memory', function () {
            const result = ReflectCached.apply(...arguments);
            proxyGetter(result, 'jsHeapSizeLimit', () => args.maxHeapSize);
            return result;
        }, true);
    }
    if ('memory' in console && console.memory) {
        proxyGetter(self.console, 'memory', function () {
            const result = ReflectCached.apply(...arguments);
            proxyGetter(result, 'jsHeapSizeLimit', () => args.maxHeapSize);
            return result;
        }, true);
    }
}
