// Logging error on any of these keys triggers a getter, which could be proxied.
// The same could technically be done for any object so to prevent detection here
// we use json stringify, so we ignore all of this dangerous logic while still
// logging as much as possible of the original object.
const keysToModifyArgs = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'log',
  'dir',
  'dirxml',
  'table',
  'group',
  'groupCollapsed',
] as const;
const KeysToDropArgs = ['groupEnd', 'clear'] as const;
const reflectCached = ReflectCached;

for (const key of keysToModifyArgs) {
  proxyFunction(console, key, (target, thisArg, args) => {
    const safeArgs = args.map(arg => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg, null, 2);
      }
      return arg;
    });

    return reflectCached.apply(target, thisArg, safeArgs);
  });
}

for (const key of KeysToDropArgs) {
  proxyFunction(console, key, (target, thisArg, _args) => {
    return reflectCached.apply(target, thisArg, []);
  });
}
