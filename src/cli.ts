#!/usr/bin/env node
import { publishExtension } from '.';
import { ChromeWebStore, EdgeAddonStore, FirefoxAddonStore } from './stores';
import { printDocs } from './utils/logger';
import { cliFlags } from './cli-flags';
import { consola } from 'consola';

async function main(exec: () => void | Promise<any>) {
  try {
    await exec();
  } catch (err) {
    consola.error(err);
    process.exit(1);
  }
}

main(async () => {
  const logger = consola;
  const chromeZip = cliFlags.chromeZip().value;
  const firefoxZip = cliFlags.firefoxZip().value;
  const edgeZip = cliFlags.edgeZip().value;

  const nothingToDo =
    chromeZip == null && firefoxZip == null && edgeZip == null;
  const askedForHelp = cliFlags.help().value;
  if (askedForHelp || nothingToDo) {
    return printDocs(logger);
  }

  const deps = {
    logger,
    chrome: ChromeWebStore,
    firefox: FirefoxAddonStore,
    edge: EdgeAddonStore,
  };

  const result = await publishExtension(
    {
      dryRun: cliFlags.dryRun().value,
      chrome: chromeZip
        ? {
            zip: chromeZip,
            extensionId: cliFlags.chromeExtensionId().value,
            clientId: cliFlags.chromeClientId().value,
            clientSecret: cliFlags.chromeClientSecret().value,
            refreshToken: cliFlags.chromeRefreshToken().value,
            publishTarget: cliFlags.chromePublishTarget().value,
            skipSubmitReview: cliFlags.chromeSkipSubmitReview().value,
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
      edge: edgeZip
        ? {
            zip: edgeZip,
            productId: cliFlags.edgeProductId().value,
            clientId: cliFlags.edgeClientId().value,
            clientSecret: cliFlags.edgeClientSecret().value,
            accessTokenUrl: cliFlags.edgeAccessTokenUrl().value,
            skipSubmitReview: cliFlags.edgeSkipSubmitReview().value,
          }
        : undefined,
    },
    deps,
  );

  const failureCount = Object.values(result).reduce((count, result) => {
    if (!result.success) {
      logger.error(result.err);
      return count++;
    }
    return count;
  }, 0);
  console.log({ failureCount, values: Object.values(result) });

  process.exit(failureCount);
});
