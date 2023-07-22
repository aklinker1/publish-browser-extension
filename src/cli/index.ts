#!/usr/bin/env node
import cac from 'cac';
import consola from 'consola';
import { version } from '../../package.json';
import { loadEnv } from './loadEnv';
import { Flags } from './flags';
import * as commands from './commands';

const cli = cac();

// Global options

cli.option('--env-file', '[string] the env file to read secrets from', {
  default: '.env.submit',
});

cli
  .option(
    '--chrome-extension-id',
    '[string] ID of the chrome extension being published',
  )
  .option(
    '--chrome-client-id',
    '[string] client ID used for authorizing requests to the CWS',
  )
  .option(
    '--chrome-client-secret',
    '[string] client secret used for authorizing requests to the CWS',
  )
  .option(
    '--chrome-refresh-token',
    '[string] refresh token used for authorizing requests to the CWS',
  )
  .option(
    '--chrome-publish-target',
    '[default|trustedTesters] which channel you would like to publish the extension to',
    { default: 'default' },
  )
  .option(
    '--chrome-skip-submit-review',
    "[bool] just upload the extension zip, don't submit it for review",
    { default: 'false' },
  );

cli
  .option(
    '--firefox-extension-id',
    "[string] ID of the extension you're publishing",
  )
  .option(
    '--firefox-jwt-issuer',
    '[string] JWT issuer used for authorizing requests to the Addon Store APIs',
  )
  .option(
    '--firefox-jwt-secret',
    '[string] JWT secret used for authorizing requests to the Addon Store APIs',
  )
  .option(
    '--firefox-channel',
    '[listed|unlisted] which channel you would like to publish the extension to',
    { default: 'listed' },
  );

cli
  .option(
    '--edge-product-id',
    "[string] product ID of the extension you're publishing",
  )
  .option(
    '--edge-client-id',
    "[string] client ID used for authorizing requests to Microsoft's addon API",
  )
  .option(
    '--edge-client-secret',
    "[string] client secret used for authorizing requests to Microsoft's addon API",
  )
  .option(
    '--edge-access-token-url',
    "[string] access token URL used for authorizing requests to Microsoft's addon API",
  )
  .option(
    '--edge-skip-submit-review',
    "[bool] just upload the extension zip, don't submit it for review",
    { default: 'false' },
  );

// SUBMIT

cli
  .command('', 'Submit an extension for review', {
    ignoreOptionDefaultValue: true,
  })
  .option(
    '--dry-run',
    "[bool] when true, just test authentication and don't upload ZIP files or submit for review",
    { default: 'false' },
  )
  .option(
    '--chrome-zip',
    '[string] the ZIP file you want to upload to the Chrome Web Store',
  )
  .option(
    '--firefox-zip',
    '[string] the ZIP file you want to upload to the Firefox Addon Store',
  )
  .option(
    '--firefox-sources-zip',
    '[string] the sources ZIP file you want to upload to the Forefox Addon Store',
  )
  .option(
    '--edge-zip',
    '[string] the ZIP file you want to upload to the Edge Addon Store',
  )
  .action(commands.submit);

// INIT

cli
  .command('init', 'Interactive walkthrough to setup secrets for submission', {
    ignoreOptionDefaultValue: true,
  })
  .action(commands.init);

// GET CWS REFRESH TOKEN

cli
  .command('get-cws-refresh-token', 'Generate a new refresh token', {
    ignoreOptionDefaultValue: true,
  })
  .action(commands.getCwsRefreshToken);

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
