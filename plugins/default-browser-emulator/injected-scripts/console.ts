ObjectCached.keys(console).forEach(key => {
  proxyFunction(console, key, (target, thisArg, args) => {
    args = replaceErrorStackWithOriginal(args);
    return ReflectCached.apply(target, thisArg, args);
  });
});

function replaceErrorStackWithOriginal(object: unknown) {
  if (!object || typeof object !== 'object') {
    return object;
  }

  if (object instanceof Error) {
    if (
      ObjectCached.getOwnPropertyDescriptor(object, 'stack').get.toString() ===
      'function () { [native code] }'
    ) {
      return object;
    }

    const error = new Error(`Unblocked stealth created new error from: ${object.message}`);
    error.stack = `${error.message}\n   Stack removed to prevent leaking debugger active (error stack was proxied)`;
    return error;
  }

  if (object instanceof Array) {
    return object.map(item => replaceErrorStackWithOriginal(item));
  }

  return ObjectCached.values(object).map(item => replaceErrorStackWithOriginal(item));
}
