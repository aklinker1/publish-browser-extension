const child_process = require('child_process');
const fs = require('fs/promises');
const esbuild = require('esbuild');
const { series, parallel } = require('gulp');
const { nodeExternalsPlugin } = require('esbuild-node-externals');

// Utils

function exec(command) {
  return new Promise((res, rej) => {
    child_process.exec(command, (err, stdout, stderr) => {
      if (err) rej(`${err?.message}:\n${stdout}\n${stderr}`);
      else res();
    });
  });
}

// Tasks

const dist = 'dist';
const ESBUILD_DEFAULTS = {
  sourcemap: true,
  outdir: dist,
  platform: 'node',
  bundle: true,
  plugins: [nodeExternalsPlugin()],
};

async function clean() {
  await fs.rm(dist, { recursive: true, force: true });
}
exports.clean = clean;

async function buildTypes() {
  await exec('tsc -p tsconfig.build.json');
}

async function buildCli() {
  await esbuild.build({
    ...ESBUILD_DEFAULTS,
    entryPoints: ['src/cli.ts'],
    format: 'iife',
  });
}

async function buildLibrary() {
  await esbuild.build({
    ...ESBUILD_DEFAULTS,
    entryPoints: ['src/index.ts'],
  });
}

exports.build = series(clean, parallel(buildTypes, buildCli, buildLibrary));
