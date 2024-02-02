"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopDocker = exports.startDockerAndLoadUrl = exports.getDockerHost = exports.buildChromeDocker = void 0;
const child_process_1 = require("child_process");
const url_1 = require("url");
const Path = require("path");
const ChromeUtils_1 = require("./ChromeUtils");
const dockerWorkingDirectory = Path.resolve(__dirname, `../../chrome-docker`);
function buildChromeDocker(version, chromeUrl) {
    const dockerName = `chromes-${version}`;
    console.log(chromeUrl);
    const chromeFolder = chromeUrl.match(/chrome_(.+)_linux.tar.gz$/)[1];
    const command = `docker build --build-arg chrome_url="${chromeUrl}" --build-arg chrome_folder="${chromeFolder}" -f "Dockerfile-linux" -t "${dockerName}" .`;
    console.log(command);
    (0, child_process_1.execSync)(command, { stdio: 'inherit', cwd: dockerWorkingDirectory });
    return dockerName;
}
exports.buildChromeDocker = buildChromeDocker;
function getDockerHost() {
    const dockerHost = (0, child_process_1.execSync)(`docker run --rm node:12-slim getent hosts host.docker.internal | awk '{ print $1 }'`, { cwd: dockerWorkingDirectory })
        .toString()
        .trim();
    console.log(`Local docker internal ip is ${dockerHost}`);
    return dockerHost;
}
exports.getDockerHost = getDockerHost;
let counter = 0;
async function startDockerAndLoadUrl(dockerName, dockerHost, url, automationType, needsLocalHost, chromeVersion) {
    const { hostname } = new url_1.URL(url);
    const hasDevtools = automationType === 'devtools';
    const dockerArgs = hasDevtools ? `-p=9222:9222` : '';
    counter += 1;
    const chromeArgs = [
        '--allow-running-insecure-content',
        '--ignore-certificate-errors',
        '--headless',
        '--incognito',
        `--user-data-dir=/tmp/${Date.now()}-${(counter += 1)}`,
    ];
    if (chromeVersion >= 109) {
        // NOTE: not working on docker.
        //   chromeArgs.push('--headless=new');
        // } else if (chromeVersion >= 96) {
        //   chromeArgs.push('--headless=chrome');
        // } else {
        //   chromeArgs.push('--headless');
    }
    // regular headless isn't launching without new
    if (chromeVersion >= 111 && !hasDevtools) {
        chromeArgs[2] = '--headless=new';
    }
    if (hasDevtools) {
        chromeArgs.push('--remote-debugging-address=0.0.0.0', '--remote-debugging-port=9222');
    }
    const hostArg = needsLocalHost ? `--add-host="${hostname}:${dockerHost}"` : '';
    const urlArg = hasDevtools ? 'about:blank' : url;
    const command = `docker run --init --rm --name ${dockerName} --privileged --ipc=host --shm-size='3gb' --cap-add=SYS_ADMIN ${hostArg} ${dockerArgs} ${dockerName} "${chromeArgs.join(' ')}" "${urlArg}"`;
    console.log(command);
    const child = (0, child_process_1.spawn)(command, { shell: true, stdio: 'pipe', cwd: dockerWorkingDirectory });
    process.on('exit', () => stopDocker(dockerName));
    process.on('SIGTERM', () => stopDocker(dockerName));
    child.stderr.setEncoding('utf8');
    child.stdout.setEncoding('utf8');
    child.stderr.pipe(process.stderr);
    child.stdout.pipe(process.stdout);
    if (hasDevtools) {
        await new Promise(resolve => {
            child.stderr.on('data', msg => {
                if (msg.includes('listening'))
                    resolve();
            });
            child.stdout.on('data', msg => {
                if (msg.includes('listening'))
                    resolve();
            });
        });
        await new Promise(resolve => setTimeout(resolve, 1e3));
        await (0, ChromeUtils_1.navigateDevtoolsToUrl)(url, 9222);
    }
    return child;
}
exports.startDockerAndLoadUrl = startDockerAndLoadUrl;
function stopDocker(dockerName) {
    console.log(`STOPPING ${dockerName}`);
    (0, child_process_1.execSync)(`docker stop ${dockerName} || true`);
}
exports.stopDocker = stopDocker;
//# sourceMappingURL=DockerUtils.js.map