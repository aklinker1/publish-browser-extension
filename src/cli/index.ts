import cac from 'cac';
import consola from 'consola';
import { version } from '../../package.json';
import { flags } from './flags';
import * as commands from './commands';

const cli = cac();

// Global options

cli.option(flags.envFile.flag, flags.envFile.description, {
  default: '.env.submit',
});

cli
  .option(flags.chromeExtensionId.flag, flags.chromeExtensionId.description)
  .option(flags.chromeClientId.flag, flags.chromeClientId.description)
  .option(flags.chromeClientSecret.flag, flags.chromeClientSecret.description)
  .option(flags.chromeRefreshToken.flag, flags.chromeRefreshToken.description)
  .option(
    flags.chromePublishTarget.flag,
    flags.chromePublishTarget.description,
    { default: 'default' },
  )
  .option(
    flags.chromeSkipSubmitReview.flag,
    flags.chromeSkipSubmitReview.description,
    { default: 'false' },
  );

cli
  .option(flags.firefoxExtensionId.flag, flags.firefoxExtensionId.description)
  .option(flags.firefoxJwtIssuer.flag, flags.firefoxJwtIssuer.description)
  .option(flags.firefoxJwtSecret.flag, flags.firefoxJwtSecret.description)
  .option(flags.firefoxChannel.flag, flags.firefoxChannel.description, {
    default: 'listed',
  });

cli
  .option(flags.edgeProductId.flag, flags.edgeProductId.description)
  .option(flags.edgeClientId.flag, flags.edgeClientId.description)
  .option(flags.edgeClientSecret.flag, flags.edgeClientSecret.description)
  .option(flags.edgeAccessTokenUrl.flag, flags.edgeAccessTokenUrl.description)
  .option(
    flags.edgeSkipSubmitReview.flag,
    flags.edgeSkipSubmitReview.description,
    { default: 'false' },
  );

// SUBMIT

cli
  .command('', 'Submit an extension for review', {
    ignoreOptionDefaultValue: true,
  })
  .option(flags.dryRun.flag, flags.dryRun.description, { default: 'false' })
  .option(flags.chromeZip.flag, flags.chromeZip.description)
  .option(flags.firefoxZip.flag, flags.firefoxZip.description)
  .option(flags.firefoxSourcesZip.flag, flags.firefoxSourcesZip.description)
  .option(flags.edgeZip.flag, flags.edgeZip.description)
  .action(commands.submit);

// INIT

cli
  .command('init', 'Interactive walkthrough to setup secrets for submission', {
    ignoreOptionDefaultValue: true,
  })
  .action(commands.init);

// Execute CLI

(async () => {
  try {
    cli.help();
    cli.name = 'publish-extension';
    cli.version(version);
    cli.parse(process.argv, { run: false });
    await cli.runMatchedCommand();
  } catch (error) {
    consola.error(error);
    process.exit(1);
  }
})();
