const hideAllLogs = true;

// Logging error on any of these levels triggers a getter, which could be proxied.
// The same could technically be done for any object so to prevent detection here
// we have to disable all console logging functionality, which is pretty annoying
// and hopefully we find a better solution for this.

const logLevels = ['trace', 'debug', 'info', 'warn', 'error', 'log'] as const;

if (hideAllLogs) {
  for (const logLevel of logLevels) {
    proxyFunction(console, logLevel, () => {
      return undefined;
    });
  }
}
