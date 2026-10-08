'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DESKTOP_ROOT = path.resolve(__dirname, '..');
const SERVICE_ROOT = path.resolve(DESKTOP_ROOT, '..', 'equality-itemcode-version');
const BUNDLED_ROOT = path.join(DESKTOP_ROOT, 'bundled');
const TOOLS_ROOT = path.join(BUNDLED_ROOT, 'tools');
const BROWSERS_ROOT = path.join(BUNDLED_ROOT, 'playwright-browsers');

function commandPaths(command) {
    const resolver = process.platform === 'win32' ? 'where.exe' : 'which';
    const result = spawnSync(resolver, [command], { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) return [];
    return String(result.stdout || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
}

function findExecutableUnder(root, executable, maxDepth = 5) {
    if (!root || !fs.existsSync(root) || maxDepth < 0) return [];
    const found = [];
    let entries;
    try {
        entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
        return found;
    }
    for (const entry of entries) {
        const fullPath = path.join(root, entry.name);
        if (entry.isFile() && entry.name.toLowerCase() === executable.toLowerCase()) {
            found.push(fullPath);
        } else if (entry.isDirectory()) {
            found.push(...findExecutableUnder(fullPath, executable, maxDepth - 1));
        }
    }
    return found;
}

function isLikelyRealFfmpeg(file) {
    if (!file || !fs.existsSync(file)) return false;
    try {
        // Chocolatey exposes a tiny shim in its bin directory. Copy the real
        // binary instead, otherwise the bundled executable cannot find the
        // installation after Chocolatey is absent on the user's machine.
        if (process.platform === 'win32' && fs.statSync(file).size < 1_000_000) return false;
        return true;
    } catch {
        return false;
    }
}

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        stdio: 'inherit',
        windowsHide: true,
        ...options
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`คำสั่งล้มเหลว (${result.status}): ${command} ${args.join(' ')}`);
    }
}

async function download(url, destination) {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error(`ดาวน์โหลดไม่สำเร็จ HTTP ${response.status}: ${url}`);
    const data = Buffer.from(await response.arrayBuffer());
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, data);
}

function resetDirectory(directory) {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.mkdirSync(directory, { recursive: true });
}

function copyExecutable(source, destination) {
    if (!source || !fs.existsSync(source)) throw new Error(`ไม่พบ executable: ${source || '(ว่าง)'}`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    if (process.platform !== 'win32') fs.chmodSync(destination, 0o755);
}

function verifyExecutable(file, args) {
    const result = spawnSync(file, args, { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) {
        throw new Error(`ตรวจสอบ executable ไม่ผ่าน: ${file}\n${result.stderr || result.error || ''}`);
    }
}

function installFfmpegIfMissing() {
    const command = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    let candidates = [process.env.FFMPEG_PATH, ...commandPaths(command)];
    let resolved = candidates.find(isLikelyRealFfmpeg);
    if (resolved) return resolved;

    if (process.platform === 'win32') {
        run('choco.exe', ['install', 'ffmpeg', '-y', '--no-progress']);
    } else if (process.platform === 'darwin') {
        run('brew', ['install', 'ffmpeg']);
    } else {
        throw new Error('รองรับการ bundle FFmpeg ใน release นี้เฉพาะ Windows และ macOS');
    }
    candidates = [
        process.env.FFMPEG_PATH,
        ...commandPaths(command),
        ...(process.platform === 'win32'
            ? findExecutableUnder(path.join(process.env.ProgramData || '', 'chocolatey', 'lib', 'ffmpeg', 'tools'), command)
            : [])
    ];
    resolved = candidates.find(isLikelyRealFfmpeg);
    if (!resolved) throw new Error('ติดตั้ง FFmpeg แล้วแต่ยังหา executable จริงไม่พบ');
    return resolved;
}

async function main() {
    if (!['win32', 'darwin'].includes(process.platform)) {
        throw new Error(`Release แบบรวม runtime รองรับเฉพาะ Windows/macOS ไม่รองรับ ${process.platform}`);
    }

    resetDirectory(BUNDLED_ROOT);
    fs.mkdirSync(TOOLS_ROOT, { recursive: true });
    fs.mkdirSync(BROWSERS_ROOT, { recursive: true });

    const nodeDestination = path.join(TOOLS_ROOT, 'node', process.platform === 'win32' ? 'node.exe' : 'node');
    copyExecutable(process.env.NODE_RUNTIME_PATH || process.execPath, nodeDestination);
    verifyExecutable(nodeDestination, ['--version']);

    const ffmpegDestination = path.join(TOOLS_ROOT, 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    copyExecutable(installFfmpegIfMissing(), ffmpegDestination);
    verifyExecutable(ffmpegDestination, ['-version']);

    const ytdlpDestination = path.join(TOOLS_ROOT, 'ytdlp', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    const ytdlpUrl = process.platform === 'win32'
        ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
        : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
    await download(ytdlpUrl, ytdlpDestination);
    if (process.platform !== 'win32') fs.chmodSync(ytdlpDestination, 0o755);
    verifyExecutable(ytdlpDestination, ['--version']);

    const playwrightCli = path.join(SERVICE_ROOT, 'node_modules', 'playwright', 'cli.js');
    if (!fs.existsSync(playwrightCli)) throw new Error(`ไม่พบ Playwright CLI: ${playwrightCli}`);
    run(process.execPath, [playwrightCli, 'install', 'chromium'], {
        env: {
            ...process.env,
            PLAYWRIGHT_BROWSERS_PATH: BROWSERS_ROOT
        }
    });
    // The current Playwright CLI also downloads ffmpeg/headless-shell helpers.
    // The service launches the Chromium browser only, so omit those optional
    // downloads from the installer to keep the release size reasonable.
    for (const entry of fs.readdirSync(BROWSERS_ROOT, { withFileTypes: true })) {
        if (entry.isDirectory() && !entry.name.toLowerCase().startsWith('chromium-')) {
            fs.rmSync(path.join(BROWSERS_ROOT, entry.name), { recursive: true, force: true });
        }
    }

    console.log(`Bundled runtime prepared for ${process.platform}/${process.arch}`);
    console.log(`Tools: ${TOOLS_ROOT}`);
    console.log(`Playwright Chromium: ${BROWSERS_ROOT}`);
}

main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
});
