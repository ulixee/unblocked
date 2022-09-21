import BrowserProfiler from '@unblocked-web/browser-profiler';
import ConfigJson from '../lib/json-creators/Config';
import ClienthelloJson from '../lib/json-creators/Clienthello';
import CodecsJson from '../lib/json-creators/Codecs';
import DomPolyfillJson from '../lib/json-creators/DomPolyfill';
import HeadersJson from '../lib/json-creators/Headers';
import UserAgentOptionsJson from '../lib/json-creators/UserAgentOptions';
import WindowChromeJson from '../lib/json-creators/WindowChrome';
import WindowFramingJson from '../lib/json-creators/WindowFraming';
import WindowNavigatorJson from '../lib/json-creators/WindowNavigator';
import Http2SessionJson from '../lib/json-creators/Http2Session';
import EmulatorData from '../lib/EmulatorData';
import updateBrowserList from '../lib/updateBrowserList';

const userAgentIdsByBrowserId: { [browserId: string]: string[] } = {};

for (const userAgentId of BrowserProfiler.userAgentIds) {
  const { browserId } = BrowserProfiler.extractMetaFromUserAgentId(userAgentId);
  userAgentIdsByBrowserId[browserId] = userAgentIdsByBrowserId[browserId] || [];
  userAgentIdsByBrowserId[browserId].push(userAgentId);
}

const forceRedoDom = process.argv[2] === 'force';

const userAgentOptionsJson = new UserAgentOptionsJson();

async function generate(): Promise<void> {
  const chromeEngines = await updateBrowserList();
  for (const browserId of Object.keys(userAgentIdsByBrowserId)) {
    if (!browserId.startsWith('chrome') && !browserId.startsWith('safari')) continue;

    console.log('--------------------------------------------------');
    console.log(`GENERATING ${browserId}`);
    const browserEngineId = EmulatorData.extractBrowserEngineId(browserId);
    const browserEngineOption = chromeEngines.find(x => x.id === browserEngineId);
    const config = new ConfigJson(browserId, browserEngineId, browserEngineOption);
    const userAgentIds = userAgentIdsByBrowserId[browserId];
    const browserDir = EmulatorData.getEmulatorDir(browserId);

    userAgentOptionsJson.add(config.browserId, config.browserEngineId, userAgentIds);

    console.log('- Clienthello');
    new ClienthelloJson(config, userAgentIds).save(browserDir);

    console.log('- Headers');
    new HeadersJson(config, userAgentIds).save(browserDir);

    console.log('- Http2');
    new Http2SessionJson(config, userAgentIds).save(browserDir);

    if (config.browserEngineOption) {
      console.log('- Codecs');
      new CodecsJson(config, userAgentIds).save(browserDir);

      console.log('- WindowChrome');
      new WindowChromeJson(config, userAgentIds).save(browserDir);

      console.log('- WindowFraming');
      new WindowFramingJson(config, userAgentIds).save(browserDir);

      console.log('- WindowNavigator');
      new WindowNavigatorJson(config, userAgentIds).save(browserDir);

      const hasAllPolyfills = DomPolyfillJson.hasAllDomPolyfills(
        browserId,
        browserDir,
        userAgentIds,
      );
      if (!hasAllPolyfills || forceRedoDom) {
        new DomPolyfillJson(config, userAgentIds).save(browserDir);
      }
    }

    config.save(browserDir);
  }

  userAgentOptionsJson.save(EmulatorData.emulatorsDirPath);
}

generate().catch(console.error);
