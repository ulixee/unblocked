const activatedDebugInfo = new WeakSet();
for (const context of [
    self.WebGLRenderingContext.prototype,
    self.WebGL2RenderingContext.prototype,
]) {
    proxyFunction(context, 'getExtension', function (originalFunction, thisArg, argArray) {
        const result = Reflect.apply(originalFunction, thisArg, argArray);
        if (argArray?.[0] === 'WEBGL_debug_renderer_info') {
            activatedDebugInfo.add(thisArg);
        }
        return result;
    });
    proxyFunction(context, 'getParameter', function (originalFunction, thisArg, argArray) {
        const parameter = argArray && argArray.length ? argArray[0] : null;
        const result = Reflect.apply(originalFunction, thisArg, argArray);
        if (args[parameter]) {
            if (!result && !activatedDebugInfo.has(context)) {
                return result;
            }
            return args[parameter];
        }
        return result;
    });
}
