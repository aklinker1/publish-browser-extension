import { publishExtension } from '.';
import { ChromeWebStore, FirefoxAddonStore } from './stores';
import { PublishOptions } from './types';
import { parseFlag, parseRequiredStringFlag } from './utils/flags';
import { Log } from './utils/log';
import { cliFlags } from './cli-flags';

async function main(exec: () => void | Promise<any>) {
  try {
    await exec();
  } catch (err) {
    console.error(err);
  }
}

main(async () => {
  const log = new Log();
  const chromeZip = cliFlags.chromeZip().value;
  const firefoxZip = cliFlags.firefoxZip().value;
  const nothingToDo = chromeZip == null && firefoxZip == null;
  const askedForHelp = cliFlags.help().value;
  if (askedForHelp || nothingToDo) {
    return log.printDocs();
  }

  const deps = {
    log,
    chrome: ChromeWebStore,
    firefox: FirefoxAddonStore,
  };

  const options: PublishOptions = {
    chrome: chromeZip
      ? {
          zip: chromeZip,
          extensionId: cliFlags.chromeExtensionId().value,
          clientId: cliFlags.chromeClientId().value,
          clientSecret: cliFlags.chromeClientSecret().value,
          refreshToken: cliFlags.chromeRefreshToken().value,
          publishTarget: cliFlags.chromePublishTarget().value,
        }
      : undefined,
    firefox: firefoxZip
      ? {
          zip: firefoxZip,
          sourcesZip: cliFlags.firefoxSourcesZip().value,
          extensionId: cliFlags.firefoxExtensionId().value,
          jwtIssuer: cliFlags.firefoxJwtIssuer().value,
          jwtSecret: cliFlags.firefoxJwtSecret().value,
          channel: cliFlags.firefoxChannel().value,
        }
      : undefined,
  };

  const result = await publishExtension(options, deps);

  let failureCount = 0;
  if (result.chrome?.success === false) failureCount++;
  if (result.firefox?.success === false) failureCount++;

  log.blankLine();

  if (failureCount > 0) {
    log.error(
      `Publishing failed for ${failureCount} store${
        failureCount === 1 ? '' : 's'
      }`,
    );
    process.stdout.write('\n');
    process.exit(failureCount);
  } else {
    log.success('Published to all stores');
    process.stdout.write('\n');
  }
});
