/**
 * Represents the value of args in commands
 */
export interface Flags {
  '--'?: string[];
  envFile?: string;
  dryRun?: string;

  chromeZip?: string;
  chromeExtensionId?: string;
  chromeClientId?: string;
  chromeClientSecret?: string;
  chromeRefreshToken?: string;
  chromeSkipSubmitReview?: string;
  chromePublishTarget?: 'default' | 'trustedTesters';

  firefoxZip?: string;
  firefoxSourcesZip?: string;
  firefoxExtensionId?: string;
  firefoxJwtIssuer?: string;
  firefoxJwtSecret?: string;
  firefoxChannel?: 'listed' | 'unlisted';

  edgeZip?: string;
  edgeProductId?: string;
  edgeClientId?: string;
  edgeClientSecret?: string;
  edgeAccessTokenUrl?: string;
  edgeSkipSubmitReview?: string;
}

export const flags = {
  dryRun: {
    flag: '--dry-run',
    env: 'DRY_RUN',
    description:
      "[bool] when true, just test authentication and don't upload ZIP files or submit for review",
  },
  envFile: {
    flag: '--env-file',
    env: 'ENV_FILE',
    description: '[string] the env file to read secrets from',
  },
  chromeZip: {
    flag: '--chrome-zip',
    env: 'CHROME_ZIP',
    description:
      '[string] the ZIP file you want to upload to the Chrome Web Store',
  },
  chromeExtensionId: {
    flag: '--chrome-extension-id',
    env: 'CHROME_EXTENSION_ID',
    default: false,
    description: '[string] ID of the chrome extension being published',
  },
  chromeClientId: {
    flag: '--chrome-client-id',
    env: 'CHROME_CLIENT_ID',
    description: '[string] client ID used for authorizing requests to the CWS',
  },
  chromeClientSecret: {
    flag: '--chrome-client-secret',
    env: 'CHROME_CLIENT_SECRET',
    description:
      '[string] client secret used for authorizing requests to the CWS',
  },
  chromeRefreshToken: {
    flag: '--chrome-refresh-token',
    env: 'CHROME_REFRESH_TOKEN',
    description:
      '[string] refresh token used for authorizing requests to the CWS',
  },
  chromePublishTarget: {
    flag: '--chrome-publish-target',
    env: 'CHROME_PUBLISH_TARGET',
    description:
      '[default|trustedTesters] which channel you would like to publish the extension to',
  },
  chromeSkipSubmitReview: {
    flag: '--chrome-skip-submit-review',
    env: 'CHROME_SKIP_SUBMIT_REVIEW',
    description:
      "[bool] just upload the extension zip, don't submit it for review",
  },
  firefoxZip: {
    flag: '--firefox-zip',
    env: 'FIREFOX_ZIP',
    description:
      '[string] the ZIP file you want to upload to the Firefox Addon Store',
  },
  firefoxSourcesZip: {
    flag: '--firefox-sources-zip',
    env: 'FIREFOX_SOURCES_ZIP',
    description:
      '[string] the sources ZIP file you want to upload to the Forefox Addon Store',
  },
  firefoxExtensionId: {
    flag: '--firefox-extension-id',
    env: 'FIREFOX_EXTENSION_ID',
    description: "[string] ID of the extension you're publishing",
  },
  firefoxJwtIssuer: {
    flag: '--firefox-jwt-issuer',
    env: 'FIREFOX_JWT_ISSUER',
    description:
      '[string] JWT issuer used for authorizing requests to the Addon Store APIs',
  },
  firefoxJwtSecret: {
    flag: '--firefox-jwt-secret',
    env: 'FIREFOX_JWT_SECRET',
    description:
      '[string] JWT secret used for authorizing requests to the Addon Store APIs',
  },
  firefoxChannel: {
    flag: '--firefox-channel',
    env: 'FIREFOX_CHANNEL',
    description:
      '[listed|unlisted] which channel you would like to publish the extension to',
  },
  edgeZip: {
    flag: '--edge-zip',
    env: 'EDGE_ZIP',
    description:
      '[string] the ZIP file you want to upload to the Edge Addon Store',
  },
  edgeProductId: {
    flag: '--edge-product-id',
    env: 'EDGE_PRODUCT_ID',
    description: "[string] product ID of the extension you're publishing",
  },
  edgeClientId: {
    flag: '--edge-client-id',
    env: 'EDGE_CLIENT_ID',
    description:
      "[string] client ID used for authorizing requests to Microsoft's addon API",
  },
  edgeClientSecret: {
    flag: '--edge-client-secret',
    env: 'EDGE_CLIENT_SECRET',
    description:
      "[string] client secret used for authorizing requests to Microsoft's addon API",
  },
  edgeAccessTokenUrl: {
    flag: '--edge-access-token-url',
    env: 'EDGE_ACCESS_TOKEN_URL',
    description:
      "[string] access token URL used for authorizing requests to Microsoft's addon API",
  },
  edgeSkipSubmitReview: {
    flag: '--edge-skip-submit-review',
    env: 'EDGE_SKIP_SUBMIT_REVIEW',
    description:
      "[bool] just upload the extension zip, don't submit it for review",
  },
} as const;

export function snakeToCamel(str: string): string {
  return str.toLowerCase().replace(/(_\w)/g, match => match[1].toUpperCase());
}

export function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, match => '_' + match[1]).toUpperCase();
}

export function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, match => '-' + match[1]);
}
