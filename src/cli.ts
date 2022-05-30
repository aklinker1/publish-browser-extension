import { exit } from 'process';
import { publishExtension } from '.';
import { ChromeWebStore, FirefoxAddonStore } from './stores';
import { PublishOptions } from './types';
import { parseFlag, parseRequiredStringFlag } from './utils/flags';
import { Log } from './utils/log';

async function main(exec: () => void | Promise<any>) {
  try {
    await exec();
  } catch (err) {
    console.error(err);
  }
}

main(async () => {
  const log = new Log();
  const deps = {
    log,
    chrome: ChromeWebStore,
    firefox: FirefoxAddonStore,
  };

  const chromeZip = parseFlag('chrome', 'string');
  const firefoxZip = parseFlag('firefox', 'string');
  const options: PublishOptions = {
    chrome: chromeZip
      ? {
          zip: chromeZip,
          extensionId: parseRequiredStringFlag('chrome-extension-id'),
          clientId: parseRequiredStringFlag('chrome-client-id'),
          clientSecret: parseRequiredStringFlag('chrome-client-secret'),
          refreshToken: parseRequiredStringFlag('chrome-refresh-token'),
          publishTarget: 'default',
        }
      : undefined,
    firefox: firefoxZip
      ? {
          zip: firefoxZip,
          extensionId: parseRequiredStringFlag('chrome-extension-id'),
          issuer: parseRequiredStringFlag('firefox-issuer'),
          secret: parseRequiredStringFlag('firefox-secret'),
        }
      : undefined,
  };

  const result = await publishExtension(options, deps);

  let failureCount = 0;
  if (result.chrome?.success === false) failureCount++;
  if (result.firefox?.success === false) failureCount++;

  if (failureCount > 0) {
    log.error(
      `Publishing failed for ${failureCount} store${
        failureCount === 1 ? '' : 's'
      }`,
    );
    process.stdout.write('\n');
    process.exit(failureCount);
  } else {
    log.success('Done!');
    process.stdout.write('\n');
  }
});
