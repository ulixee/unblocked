"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Fs = require("fs");
const util_1 = require("util");
const Helpers = require("@ulixee/unblocked-agent-testing/helpers");
const unblocked_agent_1 = require("@ulixee/unblocked-agent");
const Location_1 = require("@ulixee/unblocked-specification/agent/browser/Location");
const unblocked_agent_testing_1 = require("@ulixee/unblocked-agent-testing");
const browserUtils_1 = require("@ulixee/unblocked-agent-testing/browserUtils");
const index_1 = require("../index");
const pluginsChrome = require("./plugins-Chrome.json");
const DomOverridesBuilder_1 = require("../lib/DomOverridesBuilder");
const parseNavigatorPlugins_1 = require("../lib/utils/parseNavigatorPlugins");
const paths_1 = require("../paths");
const DomExtractor = require("./DomExtractor");
const logger = unblocked_agent_testing_1.TestLogger.forTest(module);
let navigatorConfig;
let browser;
beforeEach(Helpers.beforeEach);
beforeAll(async () => {
    const selectBrowserMeta = index_1.default.selectBrowserMeta('~ mac = 10.15');
    const { browserVersion, operatingSystemVersion } = selectBrowserMeta.userAgentOption;
    const asOsDataDir = `${paths_1.emulatorDataDir}/as-chrome-${browserVersion.major}-0/as-mac-os-${operatingSystemVersion.major}-${operatingSystemVersion.minor}`;
    const navigatorJsonPath = `${asOsDataDir}/window-navigator.json`;
    ({ navigator: navigatorConfig } = JSON.parse(Fs.readFileSync(navigatorJsonPath, 'utf8')));
    browser = new unblocked_agent_1.Browser(selectBrowserMeta.browserEngine, browserUtils_1.defaultHooks);
    Helpers.onClose(() => browser.close(), true);
    await browser.launch();
});
afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);
const debug = process.env.DEBUG || false;
test('it should override plugins in a browser window', async () => {
    const httpServer = await Helpers.runKoaServer(false);
    const context = await browser.newContext({ logger });
    Helpers.onClose(() => context.close());
    const page = await context.newPage();
    page.on('page-error', console.log);
    if (debug) {
        page.on('console', console.log);
    }
    const pluginsData = (0, parseNavigatorPlugins_1.default)(navigatorConfig);
    if (debug)
        console.log(pluginsData);
    await page.addNewDocumentScript((0, DomOverridesBuilder_1.getOverrideScript)('navigator.plugins', pluginsData).script, false);
    await page.goto(httpServer.baseUrl);
    await page.waitForLoad(Location_1.LoadStatus.DomContentLoaded);
    const hasPlugins = await page.mainFrame.evaluate(`'plugins' in navigator && 'mimeTypes' in navigator`, false);
    expect(hasPlugins).toBe(true);
    const pluginCount = await page.mainFrame.evaluate(`navigator.plugins.length`, false);
    expect(pluginCount).toBe(pluginsData.plugins.length);
    const plugin1Mimes = await page.mainFrame.evaluate(`(() => {
  let mimes = [];
  for(const mime of navigator.plugins[0]) {
    mimes.push(mime.type);
  }
  return mimes;
})()`, false);
    expect(plugin1Mimes).toStrictEqual(pluginsData.mimeTypes.map(x => x.type));
    const mimecount = await page.mainFrame.evaluate(`navigator.mimeTypes.length`, false);
    expect(mimecount).toBe(pluginsData.mimeTypes.length);
    const structure = JSON.parse((await page.mainFrame.evaluate(`new (${DomExtractor.toString()})('window').run(window, 'window',  ['Plugin', 'PluginArray', 'MimeType', 'MimeTypeArray','navigator'])`, false))).window;
    for (const proto of ['Plugin', 'PluginArray', 'MimeType', 'MimeTypeArray']) {
        if (debug)
            console.log(proto, (0, util_1.inspect)(structure[proto], false, null, true));
        expect(structure[proto]).toStrictEqual(pluginsChrome[proto]);
    }
    const navigatorPageStructure = structure.navigator;
    if (debug) {
        console.log('Installed', (0, util_1.inspect)(navigatorPageStructure.mimeTypes, false, null, true));
        console.log('Expected', (0, util_1.inspect)(navigatorConfig.mimeTypes, false, null, true));
    }
    expect(navigatorPageStructure.mimeTypes).toStrictEqual(navigatorConfig.mimeTypes);
    if (debug)
        console.log((0, util_1.inspect)(navigatorPageStructure.plugins, false, null, true));
    expect(navigatorPageStructure.plugins).toStrictEqual(navigatorConfig.plugins);
}, 60e3);
test('it should not be able to detect incognito', async () => {
    const httpServer = await Helpers.runHttpsServer((req, res) => {
        res.end('<html><head></head><body>Hi</body></html>');
    }, false);
    const context = await browser.newContext({ logger });
    Helpers.onClose(() => context.close());
    const page = await context.newPage();
    page.on('page-error', console.log);
    if (debug) {
        page.on('console', console.log);
    }
    await page.addNewDocumentScript((0, DomOverridesBuilder_1.getOverrideScript)('navigator.deviceMemory', {
        memory: 4,
        storageTib: 0.5,
        maxHeapSize: 2172649472,
    }).script, false);
    await page.goto(httpServer.baseUrl);
    await page.waitForLoad(Location_1.LoadStatus.DomContentLoaded);
    const storageEstimate = await page.evaluate(`(async () => { 
      return (await navigator.storage.estimate()).quota;
    })()`);
    // NOTE: this has some false positive as written, but this amount of temporary quota is highly suspicious
    // https://github.com/Joe12387/detectIncognito/issues/21
    const storageEstimateInMib = Math.round(storageEstimate / (1024 * 1024));
    const quotaLimit = await page.evaluate(`performance.memory.jsHeapSizeLimit`);
    const quotaLimitInMib = Math.round(quotaLimit / (1024 * 1024)) * 2;
    const tempQuota = await page.evaluate(`new Promise((resolve, reject) => {
    navigator.webkitTemporaryStorage.queryUsageAndQuota(
      (_, quota) => resolve(quota),
      reject,
    );
  })`);
    const tempQuotaInMib = Math.round(tempQuota / (1024 * 1024));
    expect(quotaLimitInMib).toBeLessThanOrEqual(tempQuotaInMib);
});
test('it should handle overflows in plugins', async () => {
    const httpServer = await Helpers.runKoaServer(false);
    const context = await browser.newContext({ logger });
    Helpers.onClose(() => context.close());
    const page = await context.newPage();
    page.on('page-error', console.log);
    if (debug) {
        page.on('console', console.log);
    }
    const pluginsData = (0, parseNavigatorPlugins_1.default)(navigatorConfig);
    if (debug)
        console.log(pluginsData);
    await page.addNewDocumentScript((0, DomOverridesBuilder_1.getOverrideScript)('navigator.plugins', pluginsData).script, false);
    await page.goto(httpServer.baseUrl);
    await page.waitForLoad(Location_1.LoadStatus.DomContentLoaded);
    // should handle Uint32 overflows
    await expect(page.mainFrame.evaluate(`navigator.plugins.item(4294967296) === navigator.plugins[0]`, false)).resolves.toBe(true);
    // should correctly support instance references
    await expect(page.mainFrame.evaluate(`navigator.plugins[0][0].enabledPlugin === navigator.plugins[0]`, false)).resolves.toBe(true);
    await expect(page.mainFrame.evaluate('navigator.plugins[0][0] === navigator.plugins[0][0]', false)).resolves.toBe(false);
});
test('it should override userAgentData in a browser window', async () => {
    const httpServer = await Helpers.runHttpsServer((req, res) => {
        res.end('<html><head></head><body>Hi</body></html>');
    });
    const brands = [];
    for (let i = 0; i < 3; i += 1) {
        const { brand, version } = navigatorConfig.userAgentData.brands[i];
        brands.push({ brand: brand._$value, version: version._$value });
    }
    const context = await browser.newContext({
        logger,
        hooks: {
            onNewPage(page) {
                return page.addNewDocumentScript((0, DomOverridesBuilder_1.getOverrideScript)('navigator', {
                    userAgentData: {
                        brands,
                        platform: 'macOS',
                        mobile: false,
                    },
                }).script, false);
            },
        },
    });
    Helpers.onClose(() => context.close());
    const page = await context.newPage();
    page.on('page-error', console.log);
    if (debug) {
        page.on('console', console.log);
    }
    const pluginsData = {};
    if (debug)
        console.log(pluginsData);
    await page.goto(httpServer.url);
    await page.waitForLoad(Location_1.LoadStatus.DomContentLoaded);
    const structure = JSON.parse((await page.mainFrame.evaluate(`new (${DomExtractor.toString()})('window').run(window, 'window',  ['NavigatorUAData','navigator'])`, false))).window;
    for (const proto of ['NavigatorUAData']) {
        if (debug)
            console.log(proto, (0, util_1.inspect)(structure[proto], false, null, true));
        expect(structure[proto]).toStrictEqual(pluginsChrome[proto]);
    }
    const navigatorPageStructure = structure.navigator;
    if (debug) {
        console.log('Installed', (0, util_1.inspect)(navigatorPageStructure, false, null, true));
        console.log('Expected', (0, util_1.inspect)(navigatorConfig, false, null, true));
    }
    expect(navigatorPageStructure.userAgentData).toStrictEqual(navigatorConfig.userAgentData);
}, 60e3);
//# sourceMappingURL=navigator.test.js.map