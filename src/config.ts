import { z } from 'zod/v4';
import { ChromeWebStoreV1_1Options } from './stores/chrome-web-store-v1.1';
import { EdgeAddonStoreV1_1Options } from './stores/edge-addon-store-v1.1';
import { FirefoxAddonStoreV5Options } from './stores/firefox-addon-store-v5';
import type { DeepPartial } from './utils/types';
import { OperaAddonsStoreOptions } from './stores/opera-addons-store';
import { ChromeWebStoreV2Options } from './stores/chrome-web-store-v2';

/** @deprecated Will be removed October 15th, 2026, when the CWS API v1.1 is shut down. */
export type AllChromeOptions = {
  [key in
    | keyof ChromeWebStoreV1_1Options
    | keyof ChromeWebStoreV2Options]: key extends keyof ChromeWebStoreV1_1Options
    ? ChromeWebStoreV1_1Options[key]
    : key extends keyof ChromeWebStoreV2Options
      ? ChromeWebStoreV2Options[key]
      : never;
};

/**
 * Given inline config, read environment variables and apply defaults. Throws an error if any config
 * is missing.
 */
export function resolveConfig(
  config: InlineConfig,
): DeepPartial<InternalConfig> {
  const dryRun = config.dryRun ?? booleanEnv('DRY_RUN') ?? false;

  const chromeZip = config.chrome?.zip ?? stringEnv('CHROME_ZIP');
  const chromeApiVersion =
    config.chrome?.apiVersion ?? stringEnv('CHROME_API_VERSION');
  const firefoxZip = config.firefox?.zip ?? stringEnv('FIREFOX_ZIP');
  const edgeZip = config.edge?.zip ?? stringEnv('EDGE_ZIP');
  const operaZip = config.opera?.zip ?? stringEnv('OPERA_ZIP');

  return {
    dryRun,
    chrome:
      chromeZip == null
        ? undefined
        : chromeApiVersion === 'v2'
          ? buildChromeV2Options(
              chromeZip,
              config.chrome as Partial<ChromeWebStoreV2Options>,
            )
          : buildChromeV1_1Options(
              chromeZip,
              config.chrome as Partial<ChromeWebStoreV1_1Options>,
            ),
    firefox:
      firefoxZip == null
        ? undefined
        : buildFirefoxV5Options(
            firefoxZip,
            config.firefox as Partial<FirefoxAddonStoreV5Options>,
          ),
    edge:
      edgeZip == null
        ? undefined
        : buildEdgeV1_1Options(
            edgeZip,
            config.edge as Partial<EdgeAddonStoreV1_1Options>,
          ),
    opera:
      operaZip == null
        ? undefined
        : buildOperaOptions(
            operaZip,
            config.opera as Partial<OperaAddonsStoreOptions>,
          ),
  };
}

function buildChromeV1_1Options(
  zip: string,
  chrome: Partial<ChromeWebStoreV1_1Options> | undefined,
): Partial<ChromeWebStoreV1_1Options> {
  return {
    zip,
    apiVersion: 'v1.1',
    clientId: chrome?.clientId ?? stringEnv('CHROME_CLIENT_ID'),
    clientSecret: chrome?.clientSecret ?? stringEnv('CHROME_CLIENT_SECRET'),
    refreshToken: chrome?.refreshToken ?? stringEnv('CHROME_REFRESH_TOKEN'),
    extensionId: chrome?.extensionId ?? stringEnv('CHROME_EXTENSION_ID'),
    publishTarget:
      chrome?.publishTarget ?? stringEnv('CHROME_PUBLISH_TARGET') ?? 'default',
    reviewExemption:
      chrome?.reviewExemption ?? booleanEnv('CHROME_REVIEW_EXEMPTION') ?? false,
    skipSubmitReview:
      chrome?.skipSubmitReview ??
      booleanEnv('CHROME_SKIP_SUBMIT_REVIEW') ??
      false,
    deployPercentage:
      chrome?.deployPercentage ?? numberEnv('CHROME_DEPLOY_PERCENTAGE'),
  };
}

function buildChromeV2Options(
  zip: string,
  chrome: Partial<ChromeWebStoreV2Options> | undefined,
): Partial<ChromeWebStoreV2Options> {
  return {
    zip,
    apiVersion: 'v2',
    extensionId: chrome?.extensionId ?? stringEnv('CHROME_EXTENSION_ID'),
    publisherId: chrome?.publisherId ?? stringEnv('CHROME_PUBLISHER_ID'),
    serviceAccountClientEmail:
      chrome?.serviceAccountClientEmail ??
      stringEnv('CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL'),
    serviceAccountPrivateKey:
      chrome?.serviceAccountPrivateKey ??
      stringEnv('CHROME_SERVICE_ACCOUNT_PRIVATE_KEY'),
    publishType: chrome?.publishType ?? stringEnv('CHROME_PUBLISH_TYPE'),
    deployPercentage:
      chrome?.deployPercentage ?? numberEnv('CHROME_DEPLOY_PERCENTAGE'),
    skipReview: chrome?.skipReview ?? booleanEnv('CHROME_SKIP_REVIEW'),
    skipSubmitReview:
      chrome?.skipSubmitReview ??
      booleanEnv('CHROME_SKIP_SUBMIT_REVIEW') ??
      false,
  };
}

function buildFirefoxV5Options(
  zip: string,
  firefox: Partial<FirefoxAddonStoreV5Options> | undefined,
): Partial<FirefoxAddonStoreV5Options> {
  return {
    zip,
    sourcesZip: firefox?.sourcesZip ?? stringEnv('FIREFOX_SOURCES_ZIP'),
    extensionId: firefox?.extensionId ?? stringEnv('FIREFOX_EXTENSION_ID'),
    jwtIssuer: firefox?.jwtIssuer ?? stringEnv('FIREFOX_JWT_ISSUER'),
    jwtSecret: firefox?.jwtSecret ?? stringEnv('FIREFOX_JWT_SECRET'),
    channel: firefox?.channel ?? stringEnv('FIREFOX_CHANNEL') ?? 'listed',
    compatibility:
      firefox?.compatibility ??
      (stringEnv('FIREFOX_COMPATIBILITY')?.split(',') as any),
  };
}

function buildEdgeV1_1Options(
  zip: string,
  edge: Partial<EdgeAddonStoreV1_1Options> | undefined,
): Partial<EdgeAddonStoreV1_1Options> {
  return {
    zip,
    productId: edge?.productId ?? stringEnv('EDGE_PRODUCT_ID'),
    clientId: edge?.clientId ?? stringEnv('EDGE_CLIENT_ID'),
    apiKey: edge?.apiKey ?? stringEnv('EDGE_API_KEY'),
    skipSubmitReview:
      edge?.skipSubmitReview ?? booleanEnv('EDGE_SKIP_SUBMIT_REVIEW') ?? false,
  };
}

function buildOperaOptions(
  zip: string,
  opera: Partial<OperaAddonsStoreOptions> | undefined,
): Partial<OperaAddonsStoreOptions> {
  return {
    zip,
    packageId: opera?.packageId ?? intEnv('OPERA_PACKAGE_ID'),
    sessionId: opera?.sessionId ?? stringEnv('OPERA_SESSION_ID'),
    skipSubmitReview:
      opera?.skipSubmitReview ??
      booleanEnv('OPERA_SKIP_SUBMIT_REVIEW') ??
      false,
  };
}

function toScreamingSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/-/g, '_')
    .toUpperCase();
}

export function validateConfig(config: any): InternalConfig {
  const result = InternalConfig.safeParse(config);

  if (!result.success) {
    throw Error(
      'Missing required config: ' +
        result.error.issues
          .map(i => i.path.map(j => toScreamingSnakeCase(String(j))).join('_'))
          .join(', '),
      { cause: result.error },
    );
  }
  return result.data;
}

function booleanEnv(name: keyof CustomEnv): boolean | undefined {
  return !process.env[name] ? undefined : process.env[name] === 'true';
}

function stringEnv<T extends string = string>(
  name: keyof CustomEnv,
): T | undefined {
  return !process.env[name] ? undefined : (process.env[name] as T);
}

function numberEnv(name: keyof CustomEnv): number | undefined {
  return !process.env[name] ? undefined : parseFloat(process.env[name]!);
}

function intEnv(name: keyof CustomEnv): number | undefined {
  return !process.env[name] ? undefined : parseInt(process.env[name]!);
}

export const InlineConfig = z.object({
  /**
   * When true, just check authentication, don't upload any zip files or submit any updates.
   */
  dryRun: z.boolean().optional(),
  /**
   * Options for publishing to chrome.
   */
  chrome: z
    .union([
      ChromeWebStoreV1_1Options.partial(),
      ChromeWebStoreV2Options.partial(),
    ])
    .optional(),
  /**
   * Options for publishing to Firefox.
   */
  firefox: FirefoxAddonStoreV5Options.partial().optional(),
  /**
   * Options for publishing to Edge.
   */
  edge: EdgeAddonStoreV1_1Options.partial().optional(),
  /**
   * Options for publishing to Opera
   */
  opera: OperaAddonsStoreOptions.partial().optional(),
});
export type InlineConfig = z.infer<typeof InlineConfig>;

export const InternalConfig = z.object({
  dryRun: z.boolean(),
  chrome: z
    .union([ChromeWebStoreV1_1Options, ChromeWebStoreV2Options])
    .optional(),
  firefox: FirefoxAddonStoreV5Options.optional(),
  edge: EdgeAddonStoreV1_1Options.optional(),
  opera: OperaAddonsStoreOptions.optional(),
});
export type InternalConfig = z.infer<typeof InternalConfig>;

export interface CustomEnv {
  DRY_RUN: string | undefined;

  // CWS
  CHROME_EXTENSION_ID: string | undefined;
  CHROME_DEPLOY_PERCENTAGE: string | undefined;
  CHROME_SKIP_SUBMIT_REVIEW: string | undefined;
  CHROME_ZIP: string | undefined;
  CHROME_API_VERSION: 'v1.1' | 'v2' | undefined;
  // CWS v1.1
  CHROME_CLIENT_ID: string | undefined;
  CHROME_CLIENT_SECRET: string | undefined;
  CHROME_PUBLISH_TARGET: string | undefined;
  CHROME_REFRESH_TOKEN: string | undefined;
  CHROME_REVIEW_EXEMPTION: string | undefined;
  // CWS v2
  CHROME_PUBLISHER_ID: string | undefined;
  CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL: string | undefined;
  CHROME_SERVICE_ACCOUNT_PRIVATE_KEY: string | undefined;
  CHROME_PUBLISH_TYPE: string | undefined;
  CHROME_SKIP_REVIEW: string | undefined;

  FIREFOX_ZIP: string | undefined;
  FIREFOX_SOURCES_ZIP: string | undefined;
  FIREFOX_EXTENSION_ID: string | undefined;
  FIREFOX_JWT_ISSUER: string | undefined;
  FIREFOX_JWT_SECRET: string | undefined;
  FIREFOX_CHANNEL: string | undefined;
  FIREFOX_COMPATIBILITY: string | undefined;

  EDGE_ZIP: string | undefined;
  EDGE_PRODUCT_ID: string | undefined;
  EDGE_CLIENT_ID: string | undefined;
  EDGE_API_KEY: string | undefined;
  EDGE_SKIP_SUBMIT_REVIEW: string | undefined;

  OPERA_ZIP: string | undefined;
  OPERA_PACKAGE_ID: string | undefined;
  OPERA_SESSION_ID: string | undefined;
  OPERA_SKIP_SUBMIT_REVIEW: string | undefined;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends CustomEnv {}
  }
}
