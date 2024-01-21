import { z } from 'zod';
import { ChromeWebStoreOptions } from './chrome';
import { EdgeAddonStoreOptions } from './edge';
import { FirefoxAddonStoreOptions } from './firefox';
import consola from 'consola';

/**
 * Given inline config, read environment varaibles and apply defaults. Throws an error if any config
 * is missing.
 */
export function resolveConfig(config: InlineConfig): InternalConfig {
  const dryRun = config.dryRun ?? booleanEnv('DRY_RUN') ?? false;

  const chromeZip = config.chrome?.zip ?? stringEnv('CHROME_ZIP');
  const firefoxZip = config.firefox?.zip ?? stringEnv('FIREFOX_ZIP');
  const edgeZip = config.edge?.zip ?? stringEnv('EDGE_ZIP');

  const result = InternalConfig.safeParse({
    dryRun,
    chrome:
      chromeZip == null
        ? undefined
        : {
            zip: chromeZip,
            extensionId:
              config.chrome?.extensionId ?? stringEnv('CHROME_EXTENSION_ID'),
            clientId: config.chrome?.clientId ?? stringEnv('CHROME_CLIENT_ID'),
            clientSecret:
              config.chrome?.clientSecret ?? stringEnv('CHROME_CLIENT_SECRET'),
            refreshToken:
              config.chrome?.refreshToken ?? stringEnv('CHROME_REFRESH_TOKEN'),
            publishTarget:
              config.chrome?.publishTarget ??
              stringEnv('CHROME_PUBLISH_TARGET') ??
              'default',
            skipSubmitReview:
              config.chrome?.skipSubmitReview ??
              booleanEnv('CHROME_SKIP_SUBMIT_REVIEW') ??
              false,
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
            clientSecret:
              config.edge?.clientSecret ?? stringEnv('EDGE_CLIENT_SECRET'),
            accessTokenUrl:
              config.edge?.accessTokenUrl ?? stringEnv('EDGE_ACCESS_TOKEN_URL'),
            skipSubmitReview:
              config.edge?.skipSubmitReview ??
              booleanEnv('EDGE_SKIP_SUBMIT_REVIEW') ??
              false,
          },
  });

  if (!result.success) {
    throw Error('Missing required config', { cause: result.error });
  }
  return result.data;
}

function booleanEnv(name: keyof CustomEnv): boolean | undefined {
  return !process.env[name] ? undefined : process.env[name] === 'true';
}

function stringEnv(name: keyof CustomEnv): string | undefined {
  return !process.env[name] ? undefined : process.env[name];
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

  CHROME_CLIENT_ID: string | undefined;
  CHROME_CLIENT_SECRET: string | undefined;
  CHROME_EXTENSION_ID: string | undefined;
  CHROME_PUBLISH_TARGET: string | undefined;
  CHROME_REFRESH_TOKEN: string | undefined;
  CHROME_SKIP_SUBMIT_REVIEW: string | undefined;
  CHROME_ZIP: string | undefined;

  FIREFOX_ZIP: string | undefined;
  FIREFOX_SOURCES_ZIP: string | undefined;
  FIREFOX_EXTENSION_ID: string | undefined;
  FIREFOX_JWT_ISSUER: string | undefined;
  FIREFOX_JWT_SECRET: string | undefined;
  FIREFOX_CHANNEL: string | undefined;

  EDGE_ZIP: string | undefined;
  EDGE_PRODUCT_ID: string | undefined;
  EDGE_CLIENT_ID: string | undefined;
  EDGE_CLIENT_SECRET: string | undefined;
  EDGE_ACCESS_TOKEN_URL: string | undefined;
  EDGE_SKIP_SUBMIT_REVIEW: string | undefined;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends CustomEnv {}
  }
}
