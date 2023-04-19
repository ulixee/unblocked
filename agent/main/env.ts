import { loadEnv, parseEnvBool } from '@ulixee/commons/lib/envUtils';

loadEnv(__dirname);
const env = process.env;
const pkgJson = require('./package.json');

export default {
  disableMitm: parseEnvBool(env.ULX_DISABLE_MITM),
  showChrome: parseEnvBool(env.ULX_SHOW_CHROME),
  noChromeSandbox: parseEnvBool(env.ULX_NO_CHROME_SANDBOX),
  disableGpu: parseEnvBool(env.ULX_DISABLE_GPU),
  defaultChromeId:
    env.ULX_DEFAULT_BROWSER_ID ||
    Object.keys(pkgJson.dependencies)
      .find(x => x.match(/^@ulixee\/chrome-\d+-0$/))
      ?.split('@ulixee/')
      ?.pop(),
  useRosettaChromeOnMac: parseEnvBool(env.ULX_USE_CHROME_ROSETTA),
};
