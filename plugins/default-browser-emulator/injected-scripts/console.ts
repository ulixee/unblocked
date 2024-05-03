// Logging error on any of these levels triggers a getter, which could be proxied.
// The same could technically be done for any object so to prevent detection here
// we have to disable all console logging functionality, which is pretty annoying
// and hopefully we find a better solution for this.
const logLevels = ['trace', 'debug', 'info', 'warn', 'error', 'log'] as const;
const reflectCached = ReflectCached;

for (const logLevel of logLevels) {
  proxyFunction(console, logLevel, (target, thisArg, args) => {
    const safeArgs = args.map(arg => {
      if (typeof arg === 'object') {
        return 'hiding arg';
      }
      return arg;
    });

    return reflectCached.apply(target, thisArg, safeArgs);
  });
}
