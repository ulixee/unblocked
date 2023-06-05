declare let newDocumentScript;

if (typeof SharedWorker !== 'undefined') {
  // shared workers don't automatically pause in devtools, so we have to manipulate
  proxyConstructor(self, 'SharedWorker', (target, argArray) => {
    if (!argArray?.length) return ProxyOverride.callOriginal;
    const [url] = argArray;
    if (url?.toString().startsWith('blob:')) {
      // read blob contents synchronously
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send();
      const text = xhr.response;
      const newBlob = new Blob([`(${newDocumentScript.toString()})();\n\n`, text]);
      return ReflectCached.construct(target, [URL.createObjectURL(newBlob)]);
    }
    return ProxyOverride.callOriginal;
  });
}
