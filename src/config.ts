import { z } from 'zod/v4';
import { ChromeWebStoreOptions } from './chrome';
import { EdgeAddonStoreOptions } from './edge';
import { FirefoxAddonStoreOptions } from './firefox';
import type { DeepPartial } from './utils/types';

/**
 * Given inline config, read environment variables and apply defaults. Throws an error if any config
 * is missing.
 */
export function resolveConfig(
  config: InlineConfig,
): DeepPartial<InternalConfig> {
  const dryRun = config.dryRun ?? booleanEnv('DRY_RUN') ?? false;

  const chromeZip = config.chrome?.zip ?? stringEnv('CHROME_ZIP');
  const firefoxZip = config.firefox?.zip ?? stringEnv('FIREFOX_ZIP');
  const edgeZip = config.edge?.zip ?? stringEnv('EDGE_ZIP');

  return {
    dryRun,
    chrome:
      chromeZip == null
        ? undefined
        : {
            zip: chromeZip,
            extensionId:
              config.chrome?.extensionId ?? stringEnv('CHROME_EXTENSION_ID'),
            publisherId:
              config.chrome?.publisherId ?? stringEnv('CHROME_PUBLISHER_ID'),
            clientId: config.chrome?.clientId ?? stringEnv('CHROME_CLIENT_ID'),
            clientSecret:
              config.chrome?.clientSecret ?? stringEnv('CHROME_CLIENT_SECRET'),
            refreshToken:
              config.chrome?.refreshToken ?? stringEnv('CHROME_REFRESH_TOKEN'),
            deployPercentage:
              config.chrome?.deployPercentage ??
              intEnv('CHROME_DEPLOY_PERCENTAGE'),
            skipSubmitReview:
              config.chrome?.skipSubmitReview ??
              booleanEnv('CHROME_SKIP_SUBMIT_REVIEW') ??
              false,
            cancelPending:
              config.chrome?.cancelPending ??
              booleanEnv('CHROME_CANCEL_PENDING') ??
              false,
            skipReview:
              config.chrome?.skipReview ??
              booleanEnv('CHROME_SKIP_REVIEW') ??
              false,
            publishType:
              config.chrome?.publishType ??
              stringEnv('CHROME_PUBLISH_TYPE') ??
              'DEFAULT_PUBLISH',
          },
    firefox:
      firefoxZip == null
        ? undefined
        : {
            zip: firefoxZip,
            sourcesZip:
              config.firefox?.sourcesZip ?? stringEnv('FIREFOX_SOURCES_ZIP'),
            extensionId:
              config.firefox?.extensionId ?? stringEnv('FIREFOX_EXTENSION_ID'),
            jwtIssuer:
              config.firefox?.jwtIssuer ?? stringEnv('FIREFOX_JWT_ISSUER'),
            jwtSecret:
              config.firefox?.jwtSecret ?? stringEnv('FIREFOX_JWT_SECRET'),
            channel:
              config.firefox?.channel ??
              stringEnv('FIREFOX_CHANNEL') ??
              'listed',
          },
    edge:
      edgeZip == null
        ? undefined
        : {
            zip: edgeZip,
            productId: config.edge?.productId ?? stringEnv('EDGE_PRODUCT_ID'),
            clientId: config.edge?.clientId ?? stringEnv('EDGE_CLIENT_ID'),
            apiKey: config.edge?.apiKey ?? stringEnv('EDGE_API_KEY'),
            clientSecret:
              config.edge?.clientSecret ?? stringEnv('EDGE_CLIENT_SECRET'),
            accessTokenUrl:
              config.edge?.accessTokenUrl ?? stringEnv('EDGE_ACCESS_TOKEN_URL'),
            skipSubmitReview:
              config.edge?.skipSubmitReview ??
              booleanEnv('EDGE_SKIP_SUBMIT_REVIEW') ??
              false,
          },
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
  chrome: ChromeWebStoreOptions.partial().optional(),
  /**
   * Options for publishing to Firefox.
   */
  firefox: FirefoxAddonStoreOptions.partial().optional(),
  /**
   * Options for publishing to Edge.
   */
  edge: EdgeAddonStoreOptions.partial().optional(),
});
export type InlineConfig = z.infer<typeof InlineConfig>;

export const InternalConfig = z.object({
  dryRun: z.boolean(),
  chrome: ChromeWebStoreOptions.optional(),
  firefox: FirefoxAddonStoreOptions.optional(),
  edge: EdgeAddonStoreOptions.optional(),
});
export type InternalConfig = z.infer<typeof InternalConfig>;

interface CustomEnv {
  DRY_RUN: string | undefined;

  CHROME_ZIP: string | undefined;
  CHROME_EXTENSION_ID: string | undefined;
  CHROME_PUBLISHER_ID: string | undefined;
  CHROME_CLIENT_ID: string | undefined;
  CHROME_CLIENT_SECRET: string | undefined;
  CHROME_REFRESH_TOKEN: string | undefined;
  CHROME_DEPLOY_PERCENTAGE: string | undefined;
  CHROME_SKIP_SUBMIT_REVIEW: string | undefined;
  CHROME_CANCEL_PENDING: string | undefined;
  CHROME_SKIP_REVIEW: string | undefined;
  CHROME_PUBLISH_TYPE: string | undefined;

  FIREFOX_ZIP: string | undefined;
  FIREFOX_SOURCES_ZIP: string | undefined;
  FIREFOX_EXTENSION_ID: string | undefined;
  FIREFOX_JWT_ISSUER: string | undefined;
  FIREFOX_JWT_SECRET: string | undefined;
  FIREFOX_CHANNEL: string | undefined;

  EDGE_ZIP: string | undefined;
  EDGE_PRODUCT_ID: string | undefined;
  EDGE_CLIENT_ID: string | undefined;
  /** @deprecated since Edge API v1.1 release */
  EDGE_CLIENT_SECRET: string | undefined;
  /** @deprecated since Edge API v1.1 release */
  EDGE_ACCESS_TOKEN_URL: string | undefined;
  EDGE_API_KEY: string | undefined;
  EDGE_SKIP_SUBMIT_REVIEW: string | undefined;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends CustomEnv {}
  }
}
