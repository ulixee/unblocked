proxyFunction(
  performance,
  'getEntriesByType',
  (target, thisArg, argArray): PerformanceEntryList => {
    let entries: PerformanceEntryList = ReflectCached.apply(target, thisArg, argArray);

    if (argArray[0] === 'navigation') {
      entries.forEach(entry => {
        //@ts-expect-error
        proxyGetter(entry, 'activationStart', () => 0);
        //@ts-expect-error
        proxyGetter(entry, 'renderBlockingStatus', () => 'non-blocking');
      });
    }

    return entries;
  },
);
