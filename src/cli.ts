import { cac } from 'cac';
import { version } from '../package.json';
import { submit } from './submit';
import { InlineConfig } from './config';
import { init } from './init';
import { chromeStatus } from './chrome/chrome-status';
import { chromeSetDeployPercentage } from './chrome/chrome-set-deploy-percentage';
import { consola } from 'consola';
import { config } from 'dotenv';

config({ path: '.env.submit', quiet: true });

const cli = cac('publish-extension');
cli.version(version);
cli.help();

// All stores
cli.option(
  '--dry-run',
  "Check authentication, but don't upload the zip or submit for review",
);
// Chrome
cli.option('--chrome-zip [chromeZip]', 'Path to extension zip to upload');
cli.option(
  '--chrome-extension-id [chromeExtensionId]',
  'The ID of the extension to be submitted',
);
cli.option(
  '--chrome-publisher-id [chromePublisherId]',
  'The publisher ID from the Chrome Web Store Developer Dashboard',
);
cli.option(
  '--chrome-client-id [chromeClientId]',
  'Client ID used for authorizing requests to the Chrome Web Store',
);
cli.option(
  '--chrome-client-secret [chromeClientSecret]',
  'Client secret used for authorizing requests to the Chrome Web Store',
);
cli.option(
  '--chrome-refresh-token [chromeRefreshToken]',
  'Refresh token used for authorizing requests to the Chrome Web Store',
);
cli.option(
  '--chrome-deploy-percentage [chromeDeployPercentage]',
  'An integer from 1-100',
);
cli.option(
  '--chrome-skip-submit-review',
  "Just upload the extension zip, don't submit it for review or publish it",
);
cli.option(
  '--chrome-cancel-pending',
  'Cancel any pending submission before uploading',
);
cli.option(
  '--chrome-skip-review',
  'Attempt to skip review if the item qualifies',
);
cli.option(
  '--chrome-publish-type [chromePublishType]',
  'Publish type: "DEFAULT_PUBLISH" or "STAGED_PUBLISH"',
);
// Firefox
cli.option('--firefox-zip [firefoxZip]', 'Path to extension zip to upload');
cli.option(
  '--firefox-sources-zip [firefoxSourcesZip]',
  'Path to sources zip to upload',
);
cli.option(
  '--firefox-extension-id [firefoxExtensionId]',
  'The ID of the extension to be submitted',
);
cli.option(
  '--firefox-jwt-issuer [firefoxJwtIssuer]',
  'Issuer used for authorizing requests to Addon Store APIs',
);
cli.option(
  '--firefox-jwt-secret [firefoxJwtSecret]',
  'Secret used for authorizing requests to Addon Store APIs',
);
cli.option(
  '--firefox-channel [firefoxChannel]',
  'The channel to publish to, "listed" or "unlisted"',
);
// Edge
cli.option('--edge-zip [edgeZip]', 'Path to extension zip to upload');
cli.option(
  '--edge-product-id [edgeProductId]',
  'Product ID listed on the developer dashboard',
);
cli.option(
  '--edge-client-id [edgeClientId]',
  'Client ID used for authorizing requests to Microsofts addon API',
);
cli.option(
  '--edge-api-key [edgeApiKey]',
  'API key used for authorizing requests to Microsofts addon API v1.1',
);
cli.option(
  '--edge-client-secret [edgeClientSecret]',
  'DEPRECATED: Client secret used for authorizing requests to Microsofts addon API v1.0 (no longer available)',
);
cli.option(
  '--edge-access-token-url [edgeAccessTokenUrl]',
  'DEPRECATED: Access token URL used for authorizing requests to Microsofts addon API v1.0 (no longer available)',
);
cli.option(
  '--edge-skip-submit-review',
  "Just upload the extension zip, don't submit it for review or publish it",
);

function configFromFlags(flags: any): InlineConfig {
  return {
    dryRun: flags.dryRun,
    chrome: {
      zip: flags.chromeZip,
      extensionId: flags.chromeExtensionId,
      publisherId: flags.chromePublisherId,
      clientId: flags.chromeClientId,
      clientSecret: flags.chromeClientSecret,
      refreshToken: flags.chromeRefreshToken,
      deployPercentage: flags.chromeDeployPercentage,
      skipSubmitReview: flags.chromeSkipSubmitReview,
      cancelPending: flags.chromeCancelPending,
      skipReview: flags.chromeSkipReview,
      publishType: flags.chromePublishType,
    },
    firefox: {
      zip: flags.firefoxZip,
      sourcesZip: flags.firefoxSourcesZip,
      extensionId: flags.firefoxExtensionId,
      jwtIssuer: flags.firefoxJwtIssuer,
      jwtSecret: flags.firefoxJwtSecret,
      channel: flags.firefoxChannel,
    },
    edge: {
      zip: flags.edgeZip,
      productId: flags.edgeProductId,
      clientId: flags.edgeClientId,
      apiKey: flags.edgeApiKey,
      clientSecret: flags.edgeClientSecret,
      accessTokenUrl: flags.edgeAccessTokenUrl,
      skipSubmitReview: flags.edgeSkipSubmitReview,
    },
  };
}

// SUBMIT

cli
  .command('', 'Submit an extension to multiple stores for review')
  .action(async flags => {
    const config = configFromFlags(flags);

    try {
      await submit(config);
    } catch (err) {
      consola.error(err);
      process.exit(1);
    }
  });

// INIT

cli
  .command(
    'init',
    'Interactive walkthrough to initialize or update secrets and options for each store',
  )
  .action(async flags => {
    const config = configFromFlags({
      // Apply some placeholder flags so all the options resolve correctly (if zip doesn't exist,
      // none of the related options are included, and init always things you haven't entered anything yet)
      chromeZip: '...',
      firefoxZip: '...',
      edgeZip: '...',
      ...flags,
    });

    try {
      await init(config);
    } catch (err) {
      consola.error(err);
      process.exit(1);
    }
  });

// STATUS

cli
  .command('status', 'Fetch the status of a Chrome extension')
  .option(
    '--chrome-extension-id [chromeExtensionId]',
    'The ID of the extension',
  )
  .option(
    '--chrome-publisher-id [chromePublisherId]',
    'The publisher ID from the Chrome Web Store Developer Dashboard',
  )
  .option(
    '--chrome-client-id [chromeClientId]',
    'Client ID used for authorizing requests',
  )
  .option(
    '--chrome-client-secret [chromeClientSecret]',
    'Client secret used for authorizing requests',
  )
  .option(
    '--chrome-refresh-token [chromeRefreshToken]',
    'Refresh token used for authorizing requests',
  )
  .action(async flags => {
    const extensionId =
      flags.chromeExtensionId ?? process.env.CHROME_EXTENSION_ID;
    const publisherId =
      flags.chromePublisherId ?? process.env.CHROME_PUBLISHER_ID;
    const clientId = flags.chromeClientId ?? process.env.CHROME_CLIENT_ID;
    const clientSecret =
      flags.chromeClientSecret ?? process.env.CHROME_CLIENT_SECRET;
    const refreshToken =
      flags.chromeRefreshToken ?? process.env.CHROME_REFRESH_TOKEN;

    if (
      !extensionId ||
      !publisherId ||
      !clientId ||
      !clientSecret ||
      !refreshToken
    ) {
      consola.error(
        'Missing required options: --chrome-extension-id, --chrome-publisher-id, --chrome-client-id, --chrome-client-secret, --chrome-refresh-token',
      );
      process.exit(1);
    }

    try {
      await chromeStatus({
        extensionId,
        publisherId,
        clientId,
        clientSecret,
        refreshToken,
      });
    } catch (err) {
      consola.error(err);
      process.exit(1);
    }
  });

// SET DEPLOY PERCENTAGE

cli
  .command(
    'set-deploy-percentage',
    'Update deployment percentage for a published Chrome extension',
  )
  .option(
    '--chrome-extension-id [chromeExtensionId]',
    'The ID of the extension',
  )
  .option(
    '--chrome-publisher-id [chromePublisherId]',
    'The publisher ID from the Chrome Web Store Developer Dashboard',
  )
  .option(
    '--chrome-client-id [chromeClientId]',
    'Client ID used for authorizing requests',
  )
  .option(
    '--chrome-client-secret [chromeClientSecret]',
    'Client secret used for authorizing requests',
  )
  .option(
    '--chrome-refresh-token [chromeRefreshToken]',
    'Refresh token used for authorizing requests',
  )
  .option(
    '--chrome-deploy-percentage <chromeDeployPercentage>',
    'Deploy percentage (1-100)',
  )
  .action(async flags => {
    const extensionId =
      flags.chromeExtensionId ?? process.env.CHROME_EXTENSION_ID;
    const publisherId =
      flags.chromePublisherId ?? process.env.CHROME_PUBLISHER_ID;
    const clientId = flags.chromeClientId ?? process.env.CHROME_CLIENT_ID;
    const clientSecret =
      flags.chromeClientSecret ?? process.env.CHROME_CLIENT_SECRET;
    const refreshToken =
      flags.chromeRefreshToken ?? process.env.CHROME_REFRESH_TOKEN;
    const deployPercentage = flags.chromeDeployPercentage
      ? parseInt(flags.chromeDeployPercentage, 10)
      : undefined;

    if (
      !extensionId ||
      !publisherId ||
      !clientId ||
      !clientSecret ||
      !refreshToken
    ) {
      consola.error(
        'Missing required options: --chrome-extension-id, --chrome-publisher-id, --chrome-client-id, --chrome-client-secret, --chrome-refresh-token',
      );
      process.exit(1);
    }

    if (!deployPercentage || deployPercentage < 1 || deployPercentage > 100) {
      consola.error(
        'Missing or invalid --chrome-deploy-percentage (must be 1-100)',
      );
      process.exit(1);
    }

    try {
      await chromeSetDeployPercentage({
        extensionId,
        publisherId,
        clientId,
        clientSecret,
        refreshToken,
        deployPercentage,
      });
    } catch (err) {
      consola.error(err);
      process.exit(1);
    }
  });

cli.parse();
