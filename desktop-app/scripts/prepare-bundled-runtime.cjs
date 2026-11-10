'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DESKTOP_ROOT = path.resolve(__dirname, '..');
const SERVICE_ROOT = path.resolve(DESKTOP_ROOT, '..', 'equality-itemcode-version');
const BUNDLED_ROOT = path.join(DESKTOP_ROOT, 'bundled');
const TOOLS_ROOT = path.join(BUNDLED_ROOT, 'tools');
const BROWSERS_ROOT = path.join(BUNDLED_ROOT, 'playwright-browsers');
const MAC_NODE_VERSION = process.env.BUNDLED_NODE_VERSION || 'v22.23.3';

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

function canonicalPath(file) {
    try {
        return fs.realpathSync(file);
    } catch {
        return path.resolve(file);
    }
}

function machoDependencies(file) {
    const result = spawnSync('otool', ['-L', file], { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) {
        throw new Error(`อ่าน Mach-O dependencies ไม่ได้: ${file}\n${result.stderr || result.error || ''}`);
    }
    return String(result.stdout || '')
        .split(/\r?\n/)
        .slice(1)
        .map(line => line.trim().split(/\s+/)[0])
        .filter(Boolean);
}

function machoRpaths(file) {
    const result = spawnSync('otool', ['-l', file], { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) return [];
    const lines = String(result.stdout || '').split(/\r?\n/);
    const rpaths = [];
    for (let index = 0; index < lines.length; index += 1) {
        if (lines[index].trim() !== 'cmd LC_RPATH') continue;
        const pathLine = lines[index + 2] || '';
        const match = pathLine.trim().match(/^path (.+?) \(offset/);
        if (match) rpaths.push(match[1]);
    }
    return rpaths;
}

function isSystemMachoDependency(dependency) {
    return dependency.startsWith('/System/Library/')
        || dependency.startsWith('/System/Applications/')
        || dependency.startsWith('/usr/lib/')
        || dependency.startsWith('/usr/libexec/');
}

function resolveMachoDependency(dependency, owner, executable) {
    const ownerDirectory = path.dirname(owner);
    const executableDirectory = path.dirname(executable);
    const candidates = [];

    if (dependency.startsWith('@loader_path/')) {
        candidates.push(path.resolve(ownerDirectory, dependency.slice('@loader_path/'.length)));
    } else if (dependency.startsWith('@executable_path/')) {
        candidates.push(path.resolve(executableDirectory, dependency.slice('@executable_path/'.length)));
    } else if (dependency.startsWith('@rpath/')) {
        const suffix = dependency.slice('@rpath/'.length);
        for (const rpath of machoRpaths(owner)) {
            const expanded = rpath
                .replace('@loader_path', ownerDirectory)
                .replace('@executable_path', executableDirectory);
            candidates.push(path.resolve(expanded, suffix));
        }
        // Homebrew Mach-O files occasionally use @rpath without retaining a
        // usable LC_RPATH after a package upgrade. These are the standard
        // arm64/x64 Homebrew library locations on the build machine.
        candidates.push(
            path.join('/opt/homebrew/lib', suffix),
            path.join('/usr/local/lib', suffix),
            path.join('/opt/local/lib', suffix)
        );
    } else if (path.isAbsolute(dependency)) {
        candidates.push(dependency);
    }

    return candidates.find(candidate => fs.existsSync(candidate)) || '';
}

function patchAndBundleMachoDependencies(source, executableDestination, libDestination) {
    if (process.platform !== 'darwin') return;

    const records = new Map();
    const visited = new Set();

    function collect(file, isExecutable = false) {
        const sourcePath = canonicalPath(file);
        if (visited.has(sourcePath) || isSystemMachoDependency(sourcePath)) return;
        visited.add(sourcePath);

        const destination = isExecutable
            ? executableDestination
            : path.join(libDestination, path.basename(sourcePath));
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        if (!fs.existsSync(destination)) fs.copyFileSync(sourcePath, destination);
        records.set(sourcePath, { source: sourcePath, destination, isExecutable });

        for (const dependency of machoDependencies(sourcePath)) {
            if (isSystemMachoDependency(dependency)) continue;
            const resolved = resolveMachoDependency(dependency, sourcePath, source);
            if (!resolved) {
                throw new Error(`ไม่พบ Mach-O dependency ของ ${sourcePath}: ${dependency}`);
            }
            collect(resolved);
        }
    }

    collect(source, true);

    for (const record of records.values()) {
        const originalDependencies = machoDependencies(record.source);
        for (const dependency of originalDependencies) {
            if (isSystemMachoDependency(dependency)) continue;
            const resolved = resolveMachoDependency(dependency, record.source, source);
            const dependencyRecord = records.get(canonicalPath(resolved));
            if (!dependencyRecord) {
                throw new Error(`ไม่พบ dependency ที่ bundle ไว้: ${dependency} จาก ${record.source}`);
            }
            const replacement = record.isExecutable
                ? `@loader_path/lib/${path.basename(dependencyRecord.destination)}`
                : `@loader_path/${path.basename(dependencyRecord.destination)}`;
            run('install_name_tool', ['-change', dependency, replacement, record.destination]);
        }
        if (!record.isExecutable) {
            run('install_name_tool', [
                '-id',
                `@loader_path/${path.basename(record.destination)}`,
                record.destination
            ]);
        }
    }

    // Sign after install_name_tool has rewritten the load commands. Electron
    // Builder may sign the enclosing app later; this ad-hoc signature makes
    // the staged executable immediately runnable during the preflight.
    for (const record of [...records.values()].reverse()) {
        run('codesign', ['--force', '--sign', '-', record.destination]);
    }
}

async function prepareMacNode(destination) {
    if (process.platform !== 'darwin') {
        copyExecutable(process.env.NODE_RUNTIME_PATH || process.execPath, destination);
        return;
    }

    const arch = process.arch === 'arm64' || process.arch === 'x64' ? process.arch : '';
    if (!arch) throw new Error(`ไม่รองรับ macOS architecture สำหรับ Node runtime: ${process.arch}`);

    const workRoot = fs.mkdtempSync(path.join(require('os').tmpdir(), 'itemcode-node-'));
    try {
        const archive = path.join(workRoot, 'node.tar.gz');
        const directory = `node-${MAC_NODE_VERSION}-darwin-${arch}`;
        const url = `https://nodejs.org/dist/${MAC_NODE_VERSION}/${directory}.tar.gz`;
        await download(url, archive);
        run('tar', ['-xzf', archive, '-C', workRoot]);
        copyExecutable(path.join(workRoot, directory, 'bin', 'node'), destination);
    } finally {
        fs.rmSync(workRoot, { recursive: true, force: true });
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
    await prepareMacNode(nodeDestination);
    verifyExecutable(nodeDestination, ['--version']);

    const ffmpegDestination = path.join(TOOLS_ROOT, 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    const ffmpegSource = installFfmpegIfMissing();
    copyExecutable(ffmpegSource, ffmpegDestination);
    if (process.platform === 'darwin') {
        patchAndBundleMachoDependencies(
            ffmpegSource,
            ffmpegDestination,
            path.join(TOOLS_ROOT, 'ffmpeg', 'lib')
        );
    }
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
    // The current Playwright CLI downloads Chromium, its headless shell, and
    // an optional ffmpeg helper. The service's default headless launch uses
    // the headless shell, so both Chromium directories must remain in the
    // offline installer. Only Playwright's separate ffmpeg helper is removed;
    // the application bundles its own FFmpeg above.
    for (const entry of fs.readdirSync(BROWSERS_ROOT, { withFileTypes: true })) {
        if (entry.isDirectory()
            && !entry.name.toLowerCase().startsWith('chromium-')
            && !entry.name.toLowerCase().startsWith('chromium_headless_shell-')) {
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
