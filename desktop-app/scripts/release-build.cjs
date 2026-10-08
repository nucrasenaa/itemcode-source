'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

function run(script, args = []) {
    const result = spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
        cwd: root,
        stdio: 'inherit',
        windowsHide: true,
        env: process.env
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status || 1);
}

run('prepare-protected-runtime.cjs');
run('prepare-bundled-runtime.cjs');

const builderCli = path.join(root, 'node_modules', 'electron-builder', 'cli.js');
const result = spawnSync(process.execPath, [builderCli, ...process.argv.slice(2)], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
    env: process.env
});
if (result.error) throw result.error;
process.exitCode = result.status || 0;
