import { validate } from 'superstruct';
import { type InlineConfig, ResolvedConfig } from './utils/config-schema';

export type {
  AllChromeOptions,
  ChromeWebStoreV1_1Options,
  ChromeWebStoreV2Options,
  EdgeAddonStoreOptions,
  EdgeAddonStoreV1_1Options,
  FirefoxAddonStoreOptions,
  FirefoxAddonStoreV5Options,
  InlineConfig,
  InternalConfig,
  OperaAddonsStoreOptions,
  ResolvedConfig,
} from './utils/config-schema';

/// gen-start:config-resolver
// prettier-ignore
/**
 * Given inline config, read environment variables and apply defaults. Throws an
 * error if any config is missing.
 */
export function resolveConfig(config?: InlineConfig): ResolvedConfig {
  const raw: Record<string, any> = {}

  // Init store objects
  const chromeZip  = (config as any)?.chrome?.zip  ?? process.env.CHROME_ZIP
  const edgeZip    = (config as any)?.edge?.zip    ?? process.env.EDGE_ZIP
  const firefoxZip = (config as any)?.firefox?.zip ?? process.env.FIREFOX_ZIP
  const operaZip   = (config as any)?.opera?.zip   ?? process.env.OPERA_ZIP

  if (chromeZip)  raw.chrome  ??= {}
  if (edgeZip)    raw.edge    ??= {}
  if (firefoxZip) raw.firefox ??= {}
  if (operaZip)   raw.opera   ??= {}

  // Set values
  raw.dryRun                           = (config as any)?.dryRun                            ?? process.env.DRY_RUN
  if (raw.chrome)  raw.chrome.apiVersion                = (config as any)?.chrome?.apiVersion                ?? process.env.CHROME_API_VERSION
  if (raw.chrome)  raw.chrome.deployPercentage          = (config as any)?.chrome?.deployPercentage          ?? process.env.CHROME_DEPLOY_PERCENTAGE
  if (raw.chrome)  raw.chrome.extensionId               = (config as any)?.chrome?.extensionId               ?? process.env.CHROME_EXTENSION_ID
  if (raw.chrome)  raw.chrome.skipSubmitReview          = (config as any)?.chrome?.skipSubmitReview          ?? process.env.CHROME_SKIP_SUBMIT_REVIEW
  if (raw.chrome)  raw.chrome.zip                       = (config as any)?.chrome?.zip                       ?? process.env.CHROME_ZIP
  if (raw.chrome)  raw.chrome.cancelPending             = (config as any)?.chrome?.cancelPending             ?? process.env.CHROME_CANCEL_PENDING
  if (raw.chrome)  raw.chrome.publisherId               = (config as any)?.chrome?.publisherId               ?? process.env.CHROME_PUBLISHER_ID
  if (raw.chrome)  raw.chrome.publishType               = (config as any)?.chrome?.publishType               ?? process.env.CHROME_PUBLISH_TYPE
  if (raw.chrome)  raw.chrome.serviceAccountClientEmail = (config as any)?.chrome?.serviceAccountClientEmail ?? process.env.CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL
  if (raw.chrome)  raw.chrome.serviceAccountPrivateKey  = (config as any)?.chrome?.serviceAccountPrivateKey  ?? process.env.CHROME_SERVICE_ACCOUNT_PRIVATE_KEY
  if (raw.chrome)  raw.chrome.skipReview                = (config as any)?.chrome?.skipReview                ?? process.env.CHROME_SKIP_REVIEW
  if (raw.chrome)  raw.chrome.clientId                  = (config as any)?.chrome?.clientId                  ?? process.env.CHROME_CLIENT_ID
  if (raw.chrome)  raw.chrome.clientSecret              = (config as any)?.chrome?.clientSecret              ?? process.env.CHROME_CLIENT_SECRET
  if (raw.chrome)  raw.chrome.publishTarget             = (config as any)?.chrome?.publishTarget             ?? process.env.CHROME_PUBLISH_TARGET
  if (raw.chrome)  raw.chrome.refreshToken              = (config as any)?.chrome?.refreshToken              ?? process.env.CHROME_REFRESH_TOKEN
  if (raw.chrome)  raw.chrome.reviewExemption           = (config as any)?.chrome?.reviewExemption           ?? process.env.CHROME_REVIEW_EXEMPTION
  if (raw.edge)    raw.edge.apiKey                      = (config as any)?.edge?.apiKey                      ?? process.env.EDGE_API_KEY
  if (raw.edge)    raw.edge.clientId                    = (config as any)?.edge?.clientId                    ?? process.env.EDGE_CLIENT_ID
  if (raw.edge)    raw.edge.productId                   = (config as any)?.edge?.productId                   ?? process.env.EDGE_PRODUCT_ID
  if (raw.edge)    raw.edge.skipSubmitReview            = (config as any)?.edge?.skipSubmitReview            ?? process.env.EDGE_SKIP_SUBMIT_REVIEW
  if (raw.edge)    raw.edge.zip                         = (config as any)?.edge?.zip                         ?? process.env.EDGE_ZIP
  if (raw.firefox) raw.firefox.channel                  = (config as any)?.firefox?.channel                  ?? process.env.FIREFOX_CHANNEL
  if (raw.firefox) raw.firefox.compatibility            = (config as any)?.firefox?.compatibility            ?? process.env.FIREFOX_COMPATIBILITY
  if (raw.firefox) raw.firefox.extensionId              = (config as any)?.firefox?.extensionId              ?? process.env.FIREFOX_EXTENSION_ID
  if (raw.firefox) raw.firefox.jwtIssuer                = (config as any)?.firefox?.jwtIssuer                ?? process.env.FIREFOX_JWT_ISSUER
  if (raw.firefox) raw.firefox.jwtSecret                = (config as any)?.firefox?.jwtSecret                ?? process.env.FIREFOX_JWT_SECRET
  if (raw.firefox) raw.firefox.sourcesZip               = (config as any)?.firefox?.sourcesZip               ?? process.env.FIREFOX_SOURCES_ZIP
  if (raw.firefox) raw.firefox.zip                      = (config as any)?.firefox?.zip                      ?? process.env.FIREFOX_ZIP
  if (raw.opera)   raw.opera.packageId                  = (config as any)?.opera?.packageId                  ?? process.env.OPERA_PACKAGE_ID
  if (raw.opera)   raw.opera.sessionId                  = (config as any)?.opera?.sessionId                  ?? process.env.OPERA_SESSION_ID
  if (raw.opera)   raw.opera.skipSubmitReview           = (config as any)?.opera?.skipSubmitReview           ?? process.env.OPERA_SKIP_SUBMIT_REVIEW
  if (raw.opera)   raw.opera.zip                        = (config as any)?.opera?.zip                        ?? process.env.OPERA_ZIP

  return validateConfig(raw);
}
/// gen-end:config-resolver

/**
 * Validate if an object matches `ResolvedConfig`, throwing an error if it is
 * invalid.
 *
 * @internal Generally, you should use `resolveConfig`, which merges env
 *           variables, applies defaults, and calls this function automatically.
 */
export function validateConfig(config: any): ResolvedConfig {
  const res = validate(config, ResolvedConfig, { coerce: true, mask: true });
  if (res[1]) return res[1];

  throw Error(
    [
      'Invalid config:',
      ...res[0]
        .failures()
        .map(err => `  - \`${err.path.join('.')}\`: ${err.message}`),
    ].join('\n'),
  );
}
