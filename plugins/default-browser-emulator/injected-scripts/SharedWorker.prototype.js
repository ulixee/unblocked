if (typeof SharedWorker !== 'undefined') {
    proxyConstructor(self, 'SharedWorker', (target, argArray) => {
        if (!argArray?.length)
            return ProxyOverride.callOriginal;
        const [url] = argArray;
        if (url?.toString().startsWith('blob:')) {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            xhr.send();
            const text = xhr.response;
            const newBlob = new Blob([`(${newDocumentScriptWrapper.toString()})();\n\n`, text]);
            return ReflectCached.construct(target, [URL.createObjectURL(newBlob)]);
        }
        return ProxyOverride.callOriginal;
    });
}
