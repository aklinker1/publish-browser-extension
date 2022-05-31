const child_process = require('child_process');
const fs = require('fs/promises');
const { createWriteStream } = require('fs');
const esbuild = require('esbuild');
const { series, parallel } = require('gulp');
const { dependencies, peerDependencies } = require('./package.json');
const archiver = require('archiver');

// Utils

function exec(command) {
  return new Promise((res, rej) => {
    child_process.exec(command, (err, stdout, stderr) => {
      if (err) rej(`${err?.message}:\n${stdout}\n${stderr}`);
      else res();
    });
  });
}

function getUniqueVersion() {
  const date = new Date();
  const year = String(date.getUTCFullYear()).substring(2);
  const monthAndDay = date.getUTCMonth() * 100 + date.getUTCDay();

  const zeroDay = new Date(date);
  zeroDay.setFullYear(1970, 0, 1);
  // Builds will be unique if done 10s apart
  const tenthSecondOfDay = Math.round(zeroDay.getTime() / (10 * 1000));
  return `${year}.${monthAndDay}.${tenthSecondOfDay}`;
}

async function createExtensionZip(file, customManifest) {
  let res, rej;
  const done = new Promise((r, j) => {
    res = r;
    rej = j;
  });
  const output = createWriteStream(file);
  const archive = archiver('zip');
  archive.on('close', res);
  archive.on('end', res);
  archive.on('finish', res);
  archive.on('warning', rej);
  archive.on('error', rej);
  archive.pipe(output);

  const manifest = {
    name: 'CI/CD Test',
    version: getUniqueVersion(),
    ...customManifest,
  };
  await fs.writeFile(extensionManifest, JSON.stringify(manifest, null, 2));
  archive.file(extensionManifest, { name: 'manifest.json' });
  archive.file('extension/background.js', { name: 'background.js' });

  archive.finalize();

  return done;
}

// Tasks

const dist = 'dist';
const chromeZip = 'extension/chrome.zip';
const firefoxZip = 'extension/firefox.zip';
const extensionManifest = 'extension/manifest.json';
const ESBUILD_DEFAULTS = {
  sourcemap: true,
  outdir: dist,
  bundle: true,
  platform: 'node',
  external: [...Object.keys(dependencies), ...Object.keys(peerDependencies)],
};

async function clean() {
  await fs.rm(dist, { recursive: true, force: true });
  await fs.rm(chromeZip, { force: true });
  await fs.rm(firefoxZip, { force: true });
}
exports.clean = clean;

async function buildTypes() {
  await exec('tsc -p tsconfig.build.json');
}

async function buildCli() {
  await esbuild.build({
    ...ESBUILD_DEFAULTS,
    entryPoints: ['src/cli.ts'],
  });
}

async function buildLibrary() {
  await esbuild.build({
    ...ESBUILD_DEFAULTS,
    entryPoints: ['src/index.ts'],
  });
}

async function buildExtension() {
  await createExtensionZip(chromeZip, {
    manifest_version: 3,
    background: {
      service_worker: 'background.js',
    },
  });
  await createExtensionZip(firefoxZip, {
    manifest_version: 2,
    background: {
      scripts: ['background.js'],
    },
  });
}
exports.buildExtension = buildExtension;

exports.build = series(clean, parallel(buildTypes, buildCli, buildLibrary));

exports.buildDev = series(
  clean,
  parallel(buildTypes, buildCli, buildLibrary, buildExtension),
);
