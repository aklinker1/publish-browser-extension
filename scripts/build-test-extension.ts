import { writeFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { ZipArchive } from 'archiver';
import { logger } from '../src/utils/logger';

// Utils

function getUniqueVersion() {
  const time = String(Date.now());
  const major = Number(time.substring(0, 2));
  const minor = Number(time.substring(2, 5));
  const patch = Number(time.substring(5, 9));
  const number = Number(time.substring(9));
  const version = `${major}.${minor}.${patch}.${number}`;
  logger.info('Using version:', version);
  return version;
}

async function createExtensionZip(file: string, customManifest: any) {
  const { resolve, reject, promise } = Promise.withResolvers<void>();
  const output = createWriteStream(file);
  const archive = new ZipArchive();
  archive.on('close', resolve);
  archive.on('end', resolve);
  archive.on('finish', resolve);
  archive.on('warning', reject);
  archive.on('error', reject);
  archive.pipe(output);

  const manifest = {
    name: 'CI/CD Test',
    ...customManifest,
  };
  await writeFile(extensionManifest, JSON.stringify(manifest, null, 2));
  archive.file(extensionManifest, { name: 'manifest.json' });
  archive.file('extension/background.js', { name: 'background.js' });

  archive.finalize();

  return promise;
}

logger.start('Creating extension ZIPs to upload...');

const chromeZip = 'extension/chrome.zip';
const firefoxZip = 'extension/firefox.zip';
const extensionManifest = 'extension/manifest.json';
const version = getUniqueVersion();

await createExtensionZip(chromeZip, {
  version,
  manifest_version: 3,
  background: {
    service_worker: 'background.js',
  },
});
await createExtensionZip(firefoxZip, {
  version,
  manifest_version: 2,
  background: {
    scripts: ['background.js'],
  },
  browser_specific_settings: {
    gecko: {
      data_collection_permissions: { required: ['none'] },
    },
  },
});
logger.success('Done');
