import { writeFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import archiver from 'archiver';

// Utils

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
  await writeFile(extensionManifest, JSON.stringify(manifest, null, 2));
  archive.file(extensionManifest, { name: 'manifest.json' });
  archive.file('extension/background.js', { name: 'background.js' });

  archive.finalize();

  return done;
}

const chromeZip = 'extension/chrome.zip';
const firefoxZip = 'extension/firefox.zip';
const extensionManifest = 'extension/manifest.json';

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
