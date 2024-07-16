const Fs = require('fs');
const Path = require('path');
const pkg = require('./package.json');
const packages = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages ?? [];
const workspaces = [];
for (const packageGlob of packages) {
    if (packageGlob.startsWith('../'))
        continue;
    let workspacePath = packageGlob;
    // if we're not in build already, need to add build
    if (!__dirname.includes('build') && !workspacePath.includes('build')) {
        workspacePath = `build/${workspacePath}`;
    }
    if (workspacePath.endsWith('/*')) {
        workspacePath = workspacePath.replace('/*', '');
        for (const subdir of Fs.readdirSync(Path.resolve(__dirname, workspacePath))) {
            if (subdir === 'node_modules')
                continue;
            if (!Fs.statSync(Path.resolve(__dirname, workspacePath, subdir)).isDirectory())
                continue;
            if (!Fs.existsSync(Path.resolve(__dirname, workspacePath, subdir, 'package.json')))
                continue;
            workspaces.push(`${workspacePath}/${subdir}`);
        }
    }
    else {
        workspaces.push(workspacePath);
    }
}
module.exports = {
    verbose: false,
    testMatch: ['**/test/*.test.js'],
    testEnvironment: 'node',
    collectCoverage: false,
    transform: {},
    collectCoverageFrom: workspaces.map(x => `${x}/**/*.js`),
    coverageReporters: ['text-summary', 'json'],
    coveragePathIgnorePatterns: [
        'node_modules',
        '<rootDir>/.*/build',
        '<rootDir>/testing/*',
        '<rootDir>/.*/interfaces/*',
        '<rootDir>/.*/interfaces/*.[ts|js]',
        '<rootDir>/.*/bin/*.[ts|js]',
        '<rootDir>/.*/start.[ts|js]',
        '<rootDir>/.*/install.[ts|js]',
        '<rootDir>/.*/install/*.[ts|js]',
        '<rootDir>/.*/server.[ts|js]',
        '<rootDir>/.*/test/.*.js',
        '<rootDir>/.*.d.ts',
        '<rootDir>/.*.json',
    ],
    globalSetup: './jest.setup.js',
    modulePathIgnorePatterns: ['node_modules'],
    globalTeardown: './jest.teardown.js',
    testTimeout: 15e3,
    reporters: ['default', ['github-actions', { silent: false }], 'summary'],
    roots: workspaces.map(x => `${x}/`),
    moduleDirectories: ['node_modules', ...workspaces.map(x => `${x}/node_modules`)],
};
//# sourceMappingURL=jest.config.js.map