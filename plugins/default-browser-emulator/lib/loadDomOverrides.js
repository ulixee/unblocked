"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DomOverridesBuilder_1 = require("./DomOverridesBuilder");
const IBrowserEmulatorConfig_1 = require("../interfaces/IBrowserEmulatorConfig");
function loadDomOverrides(config, emulationProfile, data, userAgentData) {
    const domOverrides = new DomOverridesBuilder_1.default();
    const addOverrideWithConfigOrDefault = (injectedScript, defaultConfig, registerWorkerOverride = false) => {
        const scriptConfig = config[injectedScript];
        if (!scriptConfig)
            return;
        domOverrides.add(injectedScript, scriptConfig === true ? defaultConfig : scriptConfig, registerWorkerOverride);
    };
    const deviceProfile = emulationProfile.deviceProfile;
    const isHeadless = emulationProfile.browserEngine.isHeaded !== true &&
        emulationProfile.browserEngine.isHeadlessNew !== true;
    const locale = emulationProfile.locale;
    const voices = data.speech.voices?.map(x => {
        x.default = locale.includes(x.lang);
        return x;
    });
    const domPolyfill = data.domPolyfill;
    addOverrideWithConfigOrDefault(IBrowserEmulatorConfig_1.InjectedScript.ERROR, {
        removeInjectedLines: true,
        modifyWrongProxyAndObjectString: true,
        skipDuplicateSetPrototypeLines: true,
        applyStackTraceLimit: true,
    }, true);
    addOverrideWithConfigOrDefault(IBrowserEmulatorConfig_1.InjectedScript.CONSOLE, { mode: 'patchLeaks' }, true);
    // TODO migrate others to new logic. This first requires proper types for all Plugin Args.
    // This will also allow us to configure everything in special ways. In most occasions
    // you would never want to do this, but this is very helpful for specific use-cases, e.g. testing.
    if (config[IBrowserEmulatorConfig_1.InjectedScript.JSON_STRINGIFY]) {
        domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.JSON_STRINGIFY, undefined, true);
    }
    if (config[IBrowserEmulatorConfig_1.InjectedScript.MEDIA_DEVICES_PROTOTYPE_ENUMERATE_DEVICES]) {
        domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.MEDIA_DEVICES_PROTOTYPE_ENUMERATE_DEVICES, {
            videoDevice: deviceProfile.videoDevice,
        });
    }
    if (config[IBrowserEmulatorConfig_1.InjectedScript.NAVIGATOR]) {
        domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.NAVIGATOR, {
            userAgentString: emulationProfile.userAgentOption.string,
            platform: emulationProfile.windowNavigatorPlatform,
            headless: isHeadless,
            pdfViewerEnabled: data.windowNavigator.navigator.pdfViewerEnabled?._$value,
            userAgentData,
            rtt: emulationProfile.deviceProfile.rtt,
        }, true);
    }
    if (config[IBrowserEmulatorConfig_1.InjectedScript.NAVIGATOR_DEVICE_MEMORY]) {
        domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.NAVIGATOR_DEVICE_MEMORY, {
            memory: deviceProfile.deviceMemory,
            storageTib: deviceProfile.deviceStorageTib,
            maxHeapSize: deviceProfile.maxHeapSize,
        }, true);
    }
    if (config[IBrowserEmulatorConfig_1.InjectedScript.NAVIGATOR_HARDWARE_CONCURRENCY]) {
        domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.NAVIGATOR_HARDWARE_CONCURRENCY, {
            concurrency: deviceProfile.hardwareConcurrency,
        }, true);
    }
    if (config[IBrowserEmulatorConfig_1.InjectedScript.PERFORMANCE] &&
        Number(emulationProfile.browserEngine.fullVersion.split('.')[0]) >= 109) {
        domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.PERFORMANCE);
    }
    if (domPolyfill) {
        if (config[IBrowserEmulatorConfig_1.InjectedScript.POLYFILL_ADD] && domPolyfill?.add?.length) {
            domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.POLYFILL_ADD, {
                itemsToAdd: domPolyfill.add,
            });
        }
        if (config[IBrowserEmulatorConfig_1.InjectedScript.POLYFILL_MODIFY] && domPolyfill?.modify?.length) {
            domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.POLYFILL_MODIFY, {
                itemsToAdd: domPolyfill.modify,
            });
        }
        if (config[IBrowserEmulatorConfig_1.InjectedScript.POLYFILL_REMOVE] && domPolyfill?.remove?.length) {
            domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.POLYFILL_REMOVE, {
                itemsToRemove: domPolyfill.remove,
            });
        }
        if (config[IBrowserEmulatorConfig_1.InjectedScript.POLYFILL_REORDER] && domPolyfill?.reorder?.length) {
            domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.POLYFILL_REORDER, {
                itemsToReorder: domPolyfill.add,
            });
        }
    }
    if (config[IBrowserEmulatorConfig_1.InjectedScript.SHAREDWORKER_PROTOTYPE]) {
        domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.SHAREDWORKER_PROTOTYPE, undefined, true);
    }
    if (config[IBrowserEmulatorConfig_1.InjectedScript.SPEECH_SYNTHESIS_GETVOICES] && voices?.length) {
        domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.SPEECH_SYNTHESIS_GETVOICES, { voices });
    }
    if (config[IBrowserEmulatorConfig_1.InjectedScript.WINDOW_SCREEN]) {
        const frame = data.windowFraming;
        domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.WINDOW_SCREEN, {
            unAvailHeight: frame.screenGapTop + frame.screenGapBottom,
            unAvailWidth: frame.screenGapLeft + frame.screenGapRight,
            colorDepth: emulationProfile.viewport.colorDepth ?? frame.colorDepth,
        });
    }
    if (config[IBrowserEmulatorConfig_1.InjectedScript.UNHANDLED_ERRORS_AND_REJECTIONS]) {
        domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.UNHANDLED_ERRORS_AND_REJECTIONS);
        domOverrides.registerWorkerOverrides(IBrowserEmulatorConfig_1.InjectedScript.UNHANDLED_ERRORS_AND_REJECTIONS);
    }
    if (config[IBrowserEmulatorConfig_1.InjectedScript.WEBGL_RENDERING_CONTEXT_PROTOTYPE_GETPARAMETERS]) {
        domOverrides.add(IBrowserEmulatorConfig_1.InjectedScript.WEBGL_RENDERING_CONTEXT_PROTOTYPE_GETPARAMETERS, deviceProfile.webGlParameters, true);
    }
    return domOverrides;
}
exports.default = loadDomOverrides;
//# sourceMappingURL=loadDomOverrides.js.map