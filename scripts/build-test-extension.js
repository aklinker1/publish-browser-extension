import { writeFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import archiver from 'archiver';

// Utils

function getUniqueVersion() {
  const time = String(Date.now());
  const major = Number(time.substring(0, 2));
  const minor = Number(time.substring(2, 5));
  const patch = Number(time.substring(5, 9));
  const number = Number(time.substring(9));
  const version = `${major}.${minor}.${patch}.${number}`;
  console.log('Using version:', version);
  return version;
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
