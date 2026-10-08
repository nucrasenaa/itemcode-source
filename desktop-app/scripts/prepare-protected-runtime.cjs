'use strict';

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const DESKTOP_ROOT = path.resolve(__dirname, '..');
const SERVICE_ROOT = path.resolve(DESKTOP_ROOT, '..', 'equality-itemcode-version');
const PROTECTED_APP_ROOT = path.join(DESKTOP_ROOT, '.protected-app');
const PROTECTED_SERVICE_ROOT = path.join(DESKTOP_ROOT, '.protected-service');

const protectedAppFiles = [
    ['main.js', 'node'],
    ['preload.js', 'node'],
    [path.join('renderer', 'renderer.js'), 'browser']
];

const protectedServiceFiles = [
    'index.js',
    'playwright_login.mjs',
    'browser_login_test.mjs',
    'ocr-code-utils.js',
    'youtube-chat-utils.js',
    'mac-ocr-runner.js',
    'retry-settings.js',
    'browser-result-events.js',
    'browser-retry-notification.js',
    'detected-code-queue.js'
];

const obfuscationOptions = target => ({
    target,
    compact: true,
    simplify: true,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    renameProperties: false,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayThreshold: 0.75,
    splitStrings: false,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    selfDefending: false,
    sourceMap: false
});

function ensureParent(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function protectFile(sourcePath, destinationPath, target) {
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`ไม่พบไฟล์สำหรับป้องกัน: ${sourcePath}`);
    }
    const source = fs.readFileSync(sourcePath, 'utf8');
    const result = JavaScriptObfuscator.obfuscate(source, obfuscationOptions(target));
    ensureParent(destinationPath);
    fs.writeFileSync(destinationPath, `${result.getObfuscatedCode()}\n`, 'utf8');
}

function copyFile(sourcePath, destinationPath) {
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`ไม่พบไฟล์สำหรับแพ็ก: ${sourcePath}`);
    }
    ensureParent(destinationPath);
    fs.copyFileSync(sourcePath, destinationPath);
}

function cleanDirectory(directory) {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.mkdirSync(directory, { recursive: true });
}

function copyRendererAssets() {
    const sourceRoot = path.join(DESKTOP_ROOT, 'renderer');
    const destinationRoot = path.join(PROTECTED_APP_ROOT, 'renderer');
    for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
        if (entry.name === 'renderer.js') continue;
        const sourcePath = path.join(sourceRoot, entry.name);
        const destinationPath = path.join(destinationRoot, entry.name);
        if (entry.isDirectory()) {
            fs.cpSync(sourcePath, destinationPath, { recursive: true });
        } else {
            copyFile(sourcePath, destinationPath);
        }
    }
}

function main() {
    cleanDirectory(PROTECTED_APP_ROOT);
    cleanDirectory(PROTECTED_SERVICE_ROOT);

    for (const [relativePath, target] of protectedAppFiles) {
        protectFile(
            path.join(DESKTOP_ROOT, relativePath),
            path.join(PROTECTED_APP_ROOT, relativePath),
            target
        );
    }
    copyRendererAssets();

    for (const relativePath of protectedServiceFiles) {
        protectFile(
            path.join(SERVICE_ROOT, relativePath),
            path.join(PROTECTED_SERVICE_ROOT, relativePath),
            relativePath.endsWith('.mjs') ? 'node' : 'node'
        );
    }

    console.log(`Protected production files: app=${protectedAppFiles.length}, service=${protectedServiceFiles.length}`);
}

main();
