import { createZip } from '@aklinker1/zero-zip';
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
  const zip = createZip();

  zip.addFile(
    'manifest.json',
    JSON.stringify({
      name: 'CI/CD Test',
      ...customManifest,
    }),
  );
  zip.addFile(
    'background.js',
    await Bun.file('extension/background.js').text(),
  );

  await Bun.write(file, await zip.toBuffer());
}

logger.start('Creating extension ZIPs to upload...');

const chromeZip = 'extension/chrome.zip';
const firefoxZip = 'extension/firefox.zip';
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
