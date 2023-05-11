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

proxyFunction(performance, 'getEntries', (target, thisArg, argArray): PerformanceEntryList => {
  let entries: PerformanceEntryList = ReflectCached.apply(target, thisArg, argArray);

  entries.forEach(entry => {
    if (entry.entryType === 'navigation') {
      //@ts-expect-error
      proxyGetter(entry, 'activationStart', () => 0);
      //@ts-expect-error
      proxyGetter(entry, 'renderBlockingStatus', () => 'non-blocking');
    }
  });

  return entries;
});
