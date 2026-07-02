import { cac } from 'cac';
import { version } from '../package.json';
import { submit } from './commands/submit';
import { InlineConfig, type AllChromeOptions } from './config';
import { init } from './commands/init';
import { consola } from 'consola';
import { config } from 'dotenv';
import type { ChromeWebStoreV1_1Options } from './stores/chrome-web-store-v1.1';
import type { ChromeWebStoreV2Options } from './stores/chrome-web-store-v2';
import { status } from './commands/status';
import { setDeployPercentage } from './commands/set-deploy-percentage';

config({ path: '.env.submit', quiet: true });

const cli = cac('publish-extension');
cli.version(version);
cli.help();

// All stores
cli.option(
  '--dry-run',
  "Check authentication, but don't upload the zip or submit for review",
);
// Chrome (shared)
cli.option('--chrome-zip [chromeZip]', 'Path to extension zip to upload');
cli.option(
  '--chrome-extension-id [chromeExtensionId]',
  'The ID of the extension to be submitted',
);
cli.option(
  '--chrome-api-version',
  'The API version to use for the Chrome Web Store: "v1.1" or "v2" (default: v1.1)',
);
cli.option(
  '--chrome-deploy-percentage [chromeDeployPercentage]',
  'An integer from 1-100',
);
cli.option(
  '--chrome-skip-submit-review',
  "Just upload the extension zip, don't submit it for review or publish it",
);
// Chrome (v1.1)
cli.option(
  '--chrome-client-id [chromeClientId]',
  '[api v1.1 only] Client ID used for authorizing requests to the Chrome Web Store',
);
cli.option(
  '--chrome-client-secret [chromeClientSecret]',
  '[api v1.1 only] Client secret used for authorizing requests to the Chrome Web Store',
);
cli.option(
  '--chrome-refresh-token [chromeRefreshToken]',
  '[api v1.1 only] Refresh token used for authorizing requests to the Chrome Web Store',
);
cli.option(
  '--chrome-publish-target [chromePublishTarget]',
  '[api v1.1 only] Group to publish to, "default" or "trustedTesters"',
);
cli.option(
  '--chrome-review-exemption',
  '[api v1.1 only] Submit update using expedited review process',
);
// Chrome (v2)
cli.option(
  '--chrome-publisher-id [chromePublisherId]',
  '[api v2 only] Publisher ID who owns the extension',
);
cli.option(
  '--chrome-service-account-client-email [chromeServiceAccountClientEmail]',
  '[api v2 only] Client email of the service account used for authorizing requests to the Chrome Web Store',
);
cli.option(
  '--chrome-service-account-private-key [chromeServiceAccountPrivateKey]',
  '[api v2 only] Private key of the service account used for authorizing requests to the Chrome Web Store',
);
cli.option(
  '--chrome-skip-review',
  '[api v2 only] Some updates, like ad-blocker rule updates, can skip the review process and be published immediately after submission',
);
cli.option(
  '--chrome-publish-type [chromePublishType]',
  '[api v2 only] Set to "STAGED_PUBLISH" to not publish the extension immediately after submission',
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
cli.option(
  '--firefox-compatibility [firefoxCompatibility]',
  'Comma-separated list of compatible applications, e.g. "firefox,android"',
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
// Opera
cli.option('--opera-zip [operaZip]', 'Path to extension zip to upload');
cli.option(
  '--opera-package-id [packageId]',
  'Package ID listed in the package developer URL: https://addons.opera.com/developer/package/<packageId>',
);
cli.option(
  '--opera-session-id [sessionId]',
  'Session ID used for authorizing requests to Opera Addons API',
);
cli.option(
  '--opera-skip-submit-review',
  "Just upload the extension zip, don't submit it for review or publish it",
);

function configFromFlags(flags: any): InlineConfig {
  let operaPackageId: number | undefined = undefined;

  if (flags.operaPackageId !== undefined) {
    const parsed = Number(flags.operaPackageId);

    if (!Number.isNaN(parsed) && Number.isInteger(parsed) && parsed > 0) {
      operaPackageId = parsed;
    } else {
      consola.warn(
        `Invalid value for --opera-package-id: "${flags.operaPackageId}". It must be a positive integer.`,
      );
    }
  }

  // TODO: Move back inline in the return once v1.1 support is dropped.
  const chrome: AllChromeOptions = {
    // Shared
    zip: flags.chromeZip,
    apiVersion: flags.chromeApiVersion,
    extensionId: flags.chromeExtensionId,
    deployPercentage: flags.chromeDeployPercentage,
    skipSubmitReview: flags.chromeSkipSubmitReview,
    // v1.1
    clientId: flags.chromeClientId,
    clientSecret: flags.chromeClientSecret,
    refreshToken: flags.chromeRefreshToken,
    publishTarget: flags.chromePublishTarget,
    reviewExemption: flags.chromeReviewExemption,
    // v2
    publisherId: flags.chromePublisherId,
    skipReview: flags.chromeSkipReview,
    serviceAccountClientEmail: flags.chromeServiceAccountClientEmail,
    serviceAccountPrivateKey: flags.chromeServiceAccountPrivateKey,
    publishType: flags.chromePublishType,
  };

  return {
    dryRun: flags.dryRun,
    chrome: chrome as ChromeWebStoreV1_1Options | ChromeWebStoreV2Options,
    firefox: {
      zip: flags.firefoxZip,
      sourcesZip: flags.firefoxSourcesZip,
      extensionId: flags.firefoxExtensionId,
      jwtIssuer: flags.firefoxJwtIssuer,
      jwtSecret: flags.firefoxJwtSecret,
      channel: flags.firefoxChannel,
      compatibility: flags.firefoxCompatibility?.split(','),
    },
    edge: {
      zip: flags.edgeZip,
      productId: flags.edgeProductId,
      clientId: flags.edgeClientId,
      apiKey: flags.edgeApiKey,
      skipSubmitReview: flags.edgeSkipSubmitReview,
    },
    opera: {
      zip: flags.operaZip,
      packageId: operaPackageId,
      sessionId: flags.operaSessionId,
      skipSubmitReview: flags.operaSkipSubmitReview,
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
      // none of the related options are included, and init always thinks you haven't entered anything yet)
      chromeZip: '...',
      firefoxZip: '...',
      edgeZip: '...',
      operaZip: '...',
      ...flags,
    });

    try {
      await init(config);
    } catch (err) {
      consola.error(err);
      process.exit(1);
    }
  });

// SET DEPLOY PERCENTAGE

cli
  .command(
    'set-deploy-percentage',
    'Set the deploy percentage for the extension',
  )
  .action(async flags => {
    const config = configFromFlags(flags);

    try {
      await setDeployPercentage(config);
    } catch (err) {
      consola.error(err);
      process.exit(1);
    }
  });

// STATUS

cli
  .command(
    'status',
    'Get the current published and submission status of the extension',
  )
  .action(async flags => {
    const config = configFromFlags(flags);

    try {
      await status(config);
    } catch (err) {
      consola.error(err);
      process.exit(1);
    }
  });

cli.parse();
