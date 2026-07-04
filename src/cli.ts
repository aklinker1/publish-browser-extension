import { cac } from 'cac';
import { version } from '../package.json';
import { submit } from './commands/submit';
import { init } from './commands/init';
import { config } from 'dotenv';
import type { InlineConfig } from './config';
import { status } from './commands/status';
import { setDeployPercentage } from './commands/set-deploy-percentage';
import { logger } from './utils/logger';

config({ path: '.env.submit', quiet: true });

const cli = cac('publish-extension');
cli.version(version);
cli.help();

/// gen-start:cli-flags
// prettier-ignore
{
  cli.option('--dry-run [dryRun]', "Check authentication, but don't upload the zip or submit for review (default: false)")
  cli.option('--chrome-api-version [chromeApiVersion]', "The API version to use for the Chrome Web Store: \"v1.1\" or \"v2\"")
  cli.option('--chrome-deploy-percentage [chromeDeployPercentage]', "An integer from 0-100")
  cli.option('--chrome-extension-id [chromeExtensionId]', "The ID of the extension to be submitted")
  cli.option('--chrome-skip-submit-review [chromeSkipSubmitReview]', "Just upload the extension zip, don't submit it for review or publish it (default: false)")
  cli.option('--chrome-zip [chromeZip]', "Path to extension zip to upload")
  cli.option('--chrome-cancel-pending [chromeCancelPending]', "[API v2 only] Cancel any pending review before submitting the new version (default: false)")
  cli.option('--chrome-publisher-id [chromePublisherId]', "[API v2 only] Publisher ID who owns the extension")
  cli.option('--chrome-publish-type [chromePublishType]', "[API v2 only] Set to \"STAGED_PUBLISH\" to not publish the extension immediately after submission")
  cli.option('--chrome-service-account-client-email [chromeServiceAccountClientEmail]', "[API v2 only] Client email of the service account used for authorizing requests to the Chrome Web Store")
  cli.option('--chrome-service-account-private-key [chromeServiceAccountPrivateKey]', "[API v2 only] Private key of the service account used for authorizing requests to the Chrome Web Store")
  cli.option('--chrome-skip-review [chromeSkipReview]', "[API v2 only] Some updates, like ad-blocker rule updates, can skip the review process and be published immediately after submission")
  cli.option('--chrome-client-id [chromeClientId]', "[Deprecated: API v1.1 only] Client ID used for authorizing requests to the Chrome Web Store")
  cli.option('--chrome-client-secret [chromeClientSecret]', "[Deprecated: API v1.1 only] Client secret used for authorizing requests to the Chrome Web Store")
  cli.option('--chrome-publish-target [chromePublishTarget]', "[Deprecated: API v1.1 only] Group to publish to, \"default\" or \"trustedTesters\"")
  cli.option('--chrome-refresh-token [chromeRefreshToken]', "[Deprecated: API v1.1 only] Refresh token used for authorizing requests to the Chrome Web Store")
  cli.option('--chrome-review-exemption [chromeReviewExemption]', "[Deprecated: API v1.1 only] Submit update using expedited review process")
  cli.option('--edge-api-key [edgeApiKey]', "API key used for authorizing requests to Microsofts addon API v1.1")
  cli.option('--edge-client-id [edgeClientId]', "Client ID used for authorizing requests to Microsofts addon API")
  cli.option('--edge-product-id [edgeProductId]', "Product ID listed on the developer dashboard")
  cli.option('--edge-skip-submit-review [edgeSkipSubmitReview]', "Just upload the extension zip, don't submit it for review or publish it (default: false)")
  cli.option('--edge-zip [edgeZip]', "Path to extension zip to upload")
  cli.option('--firefox-channel [firefoxChannel]', "The channel to publish to, \"listed\" or \"unlisted\" (default: \"listed\")")
  cli.option('--firefox-compatibility [firefoxCompatibility]', "Comma-separated list of compatible applications, e.g. \"firefox,android\" - \"firefox\" for compatibility with Firefox desktop apps, \"android\" for Firefox Android apps")
  cli.option('--firefox-extension-id [firefoxExtensionId]', "The ID of the extension to be submitted")
  cli.option('--firefox-jwt-issuer [firefoxJwtIssuer]', "Issuer used for authorizing requests to Addon Store APIs")
  cli.option('--firefox-jwt-secret [firefoxJwtSecret]', "Secret used for authorizing requests to Addon Store APIs")
  cli.option('--firefox-skip-submit-review [firefoxSkipSubmitReview]', "Just upload the extension zip, don't submit it for review or publish it (default: false)")
  cli.option('--firefox-sources-zip [firefoxSourcesZip]', "Path to sources zip to upload")
  cli.option('--firefox-zip [firefoxZip]', "Path to extension zip to upload")
  cli.option('--opera-package-id [operaPackageId]', "Package ID listed in the package developer URL: https://addons.opera.com/developer/package/<packageId>")
  cli.option('--opera-session-id [operaSessionId]', "Session ID used for authorizing requests to Opera Addons API")
  cli.option('--opera-skip-submit-review [operaSkipSubmitReview]', "Just upload the extension zip, don't submit it for review or publish it (default: false)")
  cli.option('--opera-zip [operaZip]', "Path to extension zip to upload")
}
/// gen-end:cli-flags

/// gen-start:config-from-flags
// prettier-ignore
function configFromFlags(flags: any): InlineConfig {
  const config: any = {}

  // Init store objects
  config.chrome ??= {}
  config.edge ??= {}
  config.firefox ??= {}
  config.opera ??= {}

  // Set values
  config.dryRun = flags.dryRun
  config.chrome.apiVersion = flags.chromeApiVersion
  config.chrome.deployPercentage = flags.chromeDeployPercentage
  config.chrome.extensionId = flags.chromeExtensionId
  config.chrome.skipSubmitReview = flags.chromeSkipSubmitReview
  config.chrome.zip = flags.chromeZip
  config.chrome.cancelPending = flags.chromeCancelPending
  config.chrome.publisherId = flags.chromePublisherId
  config.chrome.publishType = flags.chromePublishType
  config.chrome.serviceAccountClientEmail = flags.chromeServiceAccountClientEmail
  config.chrome.serviceAccountPrivateKey = flags.chromeServiceAccountPrivateKey
  config.chrome.skipReview = flags.chromeSkipReview
  config.chrome.clientId = flags.chromeClientId
  config.chrome.clientSecret = flags.chromeClientSecret
  config.chrome.publishTarget = flags.chromePublishTarget
  config.chrome.refreshToken = flags.chromeRefreshToken
  config.chrome.reviewExemption = flags.chromeReviewExemption
  config.edge.apiKey = flags.edgeApiKey
  config.edge.clientId = flags.edgeClientId
  config.edge.productId = flags.edgeProductId
  config.edge.skipSubmitReview = flags.edgeSkipSubmitReview
  config.edge.zip = flags.edgeZip
  config.firefox.channel = flags.firefoxChannel
  config.firefox.compatibility = flags.firefoxCompatibility
  config.firefox.extensionId = flags.firefoxExtensionId
  config.firefox.jwtIssuer = flags.firefoxJwtIssuer
  config.firefox.jwtSecret = flags.firefoxJwtSecret
  config.firefox.skipSubmitReview = flags.firefoxSkipSubmitReview
  config.firefox.sourcesZip = flags.firefoxSourcesZip
  config.firefox.zip = flags.firefoxZip
  config.opera.packageId = flags.operaPackageId
  config.opera.sessionId = flags.operaSessionId
  config.opera.skipSubmitReview = flags.operaSkipSubmitReview
  config.opera.zip = flags.operaZip

  return config
}
/// gen-end:config-from-flags

/**
 * Same as `configFromFlags`, but add fake ZIP file paths for stores that don't have a ZIP file specified.
 *
 * `resolveConfig` will return `undefined` for store options unless a ZIP file is specified.
 */
function configFromFlagsWithFakeZip(
  flags: any,
  zips: {
    chrome?: boolean;
    firefox?: boolean;
    edge?: boolean;
    opera?: boolean;
  },
) {
  return configFromFlags({
    chromeZip: zips.chrome ? '...' : undefined,
    firefoxZip: zips.firefox ? '...' : undefined,
    edgeZip: zips.edge ? '...' : undefined,
    operaZip: zips.opera ? '...' : undefined,
    ...flags,
  });
}

// SUBMIT

cli
  .command('', 'Submit an extension to multiple stores for review')
  .action(async flags => {
    const config = configFromFlags(flags);

    try {
      await submit(config);
    } catch (err) {
      logger.fatal(err);
    }
  });

// INIT

cli
  .command(
    'init',
    'Interactive walkthrough to initialize or update secrets and options for each store',
  )
  .action(async flags => {
    const config = configFromFlagsWithFakeZip(flags, {
      chrome: true,
      firefox: true,
      opera: true,
      edge: true,
    });

    try {
      await init(config);
    } catch (err) {
      logger.fatal(err);
    }
  });

// SET DEPLOY PERCENTAGE

cli
  .command(
    'set-deploy-percentage',
    'Set the deploy percentage for the extension',
  )
  .action(async flags => {
    const config = configFromFlagsWithFakeZip(flags, {
      chrome: true,
    });

    try {
      await setDeployPercentage(config);
    } catch (err) {
      logger.fatal(err);
    }
  });

// STATUS

cli
  .command(
    'status',
    'Get the current published and submission status of the extension',
  )
  .action(async flags => {
    const config = configFromFlagsWithFakeZip(flags, {
      chrome: true,
    });

    try {
      await status(config);
    } catch (err) {
      logger.fatal(err);
    }
  });

cli.parse();
