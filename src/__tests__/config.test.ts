import { describe, it, expect, beforeEach } from 'bun:test';
import {
  type InlineConfig,
  type ResolvedConfig,
  resolveConfig,
  validateConfig,
} from '../config';
import type { FirefoxAddonStoreV5Options } from '../utils/config-schema';

const RESET_ENV_NAMES =
  /(^CHROME_|^FIREFOX_|^EDGE_|^OPERA_|^SAFARI_|^DRY_RUN$)/;

describe('resolveConfig', () => {
  beforeEach(() => {
    Object.keys(process.env).forEach(key => {
      if (RESET_ENV_NAMES.exec(key)) {
        // console.log("DELETING", key);
        delete process.env[key];
      }
    });
  });

  it('should return the config passed in if everything is passed', () => {
    const config = {
      dryRun: true,
      chrome: {
        apiVersion: 'v2',
        serviceAccountClientEmail: 'clientEmail',
        serviceAccountPrivateKey: 'privateKey',
        deployPercentage: 50,
        extensionId: 'extensionId',
        publisherId: 'publisherId',
        publishType: 'STAGED_PUBLISH',
        skipReview: true,
        skipSubmitReview: true,
        cancelPending: true,
        zip: 'zip',
      },
      firefox: {
        jwtIssuer: 'jwtIssuer',
        jwtSecret: 'jwtSecret',
        extensionId: 'extensionId',
        channel: 'unlisted',
        zip: 'zip',
        sourcesZip: 'sourcesZip',
        skipSubmitReview: true,
      },
      edge: {
        productId: 'productId',
        clientId: 'clientId',
        apiKey: 'apiKey',
        skipSubmitReview: true,
        zip: 'zip',
      },
      opera: {
        zip: 'zip',
        packageId: 1,
        sessionId: 'sessionId',
        skipSubmitReview: true,
      },
      safari: {
        bundlePath: 'bundle.pkg',
        bundleType: 'macos',
        apiKeyId: 'keyId',
        apiIssuerId: 'issuerId',
        apiPrivateKeyPath: 'AuthKey.p8',
      },
    } satisfies ResolvedConfig;

    const actual = resolveConfig(config);

    expect(actual).toEqual(config);
  });

  it('should fallback to environment variables even if config is empty', () => {
    const dryRun = true;
    process.env.DRY_RUN = String(dryRun);

    process.env.CHROME_ZIP = 'CHROME_ZIP';
    process.env.CHROME_API_VERSION = 'v2';
    process.env.CHROME_EXTENSION_ID = 'CHROME_EXTENSION_ID';
    const chromeSkipSubmitReview = true;
    process.env.CHROME_SKIP_SUBMIT_REVIEW = String(chromeSkipSubmitReview);
    const chromeSkipReview = true;
    process.env.CHROME_SKIP_REVIEW = String(chromeSkipReview);
    const chromeDeployPercentage = 75;
    process.env.CHROME_DEPLOY_PERCENTAGE = String(chromeDeployPercentage);
    process.env.CHROME_PUBLISHER_ID = 'CHROME_PUBLISHER_ID';
    process.env.CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL =
      'CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL';
    process.env.CHROME_SERVICE_ACCOUNT_PRIVATE_KEY =
      'CHROME_SERVICE_ACCOUNT_PRIVATE_KEY';
    const chromePublishType = 'STAGED_PUBLISH';
    process.env.CHROME_PUBLISH_TYPE = chromePublishType;

    process.env.FIREFOX_ZIP = 'FIREFOX_ZIP';
    process.env.FIREFOX_SOURCES_ZIP = 'FIREFOX_SOURCES_ZIP';
    process.env.FIREFOX_EXTENSION_ID = 'FIREFOX_EXTENSION_ID';
    process.env.FIREFOX_JWT_ISSUER = 'FIREFOX_JWT_ISSUER';
    process.env.FIREFOX_JWT_SECRET = 'FIREFOX_JWT_SECRET';
    const firefoxChannel = 'unlisted';
    process.env.FIREFOX_CHANNEL = firefoxChannel;
    const firefoxCompatibility: FirefoxAddonStoreV5Options['compatibility'] = [
      'android',
      'firefox',
    ];
    process.env.FIREFOX_COMPATIBILITY = firefoxCompatibility.join(',');
    const firefoxSkipSubmitReview = true;
    process.env.FIREFOX_SKIP_SUBMIT_REVIEW = String(firefoxSkipSubmitReview);

    process.env.EDGE_ZIP = 'EDGE_ZIP';
    process.env.EDGE_PRODUCT_ID = 'EDGE_PRODUCT_ID';
    process.env.EDGE_CLIENT_ID = 'EDGE_CLIENT_ID';
    process.env.EDGE_API_KEY = 'EDGE_API_KEY';
    const edgeSkipSubmitReview = true;
    process.env.EDGE_SKIP_SUBMIT_REVIEW = String(edgeSkipSubmitReview);

    process.env.OPERA_ZIP = 'OPERA_ZIP';
    process.env.OPERA_SESSION_ID = 'OPERA_SESSION_ID';
    const operaPackageId = 1;
    process.env.OPERA_PACKAGE_ID = String(operaPackageId);
    const operaSkipSubmitReview = true;
    process.env.OPERA_SKIP_SUBMIT_REVIEW = String(operaSkipSubmitReview);

    process.env.SAFARI_BUNDLE_PATH = 'SAFARI_BUNDLE_PATH';
    process.env.SAFARI_BUNDLE_TYPE = 'macos';
    process.env.SAFARI_API_KEY_ID = 'SAFARI_API_KEY_ID';
    process.env.SAFARI_API_ISSUER_ID = 'SAFARI_API_ISSUER_ID';
    process.env.SAFARI_API_PRIVATE_KEY_PATH = 'SAFARI_API_PRIVATE_KEY_PATH';

    const expected: ResolvedConfig = {
      dryRun,
      chrome: {
        apiVersion: 'v2',
        zip: process.env.CHROME_ZIP!,
        extensionId: process.env.CHROME_EXTENSION_ID!,
        publisherId: process.env.CHROME_PUBLISHER_ID!,
        serviceAccountClientEmail:
          process.env.CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL!,
        serviceAccountPrivateKey:
          process.env.CHROME_SERVICE_ACCOUNT_PRIVATE_KEY!,
        publishType: chromePublishType,
        skipReview: chromeSkipReview,
        deployPercentage: chromeDeployPercentage,
        skipSubmitReview: chromeSkipSubmitReview,
        cancelPending: false,
      },
      firefox: {
        zip: process.env.FIREFOX_ZIP,
        sourcesZip: process.env.FIREFOX_SOURCES_ZIP,
        channel: firefoxChannel,
        extensionId: process.env.FIREFOX_EXTENSION_ID,
        jwtIssuer: process.env.FIREFOX_JWT_ISSUER,
        jwtSecret: process.env.FIREFOX_JWT_SECRET,
        compatibility: firefoxCompatibility,
        skipSubmitReview: firefoxSkipSubmitReview,
      },
      edge: {
        zip: process.env.EDGE_ZIP,
        productId: process.env.EDGE_PRODUCT_ID,
        clientId: process.env.EDGE_CLIENT_ID,
        apiKey: process.env.EDGE_API_KEY,
        skipSubmitReview: edgeSkipSubmitReview,
      },
      opera: {
        zip: process.env.OPERA_ZIP,
        packageId: operaPackageId,
        sessionId: process.env.OPERA_SESSION_ID!,
        skipSubmitReview: operaSkipSubmitReview,
      },
      safari: {
        bundlePath: process.env.SAFARI_BUNDLE_PATH!,
        bundleType: 'macos',
        apiKeyId: process.env.SAFARI_API_KEY_ID!,
        apiIssuerId: process.env.SAFARI_API_ISSUER_ID!,
        apiPrivateKeyPath: process.env.SAFARI_API_PRIVATE_KEY_PATH!,
      },
    };

    const actual = resolveConfig({});
    expect(actual).toEqual(expected);
  });

  it('should apply defaults', () => {
    const config: InlineConfig = {
      chrome: {
        apiVersion: 'v2',
        extensionId: 'extensionId',
        publisherId: 'publisherId',
        serviceAccountClientEmail: 'serviceAccountClientEmail',
        serviceAccountPrivateKey: 'serviceAccountPrivateKey',
        zip: 'zip',
      },
      firefox: {
        jwtIssuer: 'jwtIssuer',
        jwtSecret: 'jwtSecret',
        extensionId: 'extensionId',
        zip: 'zip',
        sourcesZip: 'sourcesZip',
      },
      edge: {
        clientId: 'clientId',
        productId: 'productId',
        apiKey: 'apiKey',
        zip: 'zip',
      },
      opera: {
        zip: 'zip',
        packageId: 1,
        sessionId: 'sessionId',
      },
      safari: {
        bundlePath: 'bundle.pkg',
        apiKeyId: 'keyId',
        apiIssuerId: 'issuerId',
        apiPrivateKeyPath: 'AuthKey.p8',
      },
    };

    const expected = {
      ...config,
      dryRun: false,
      chrome: {
        ...config.chrome,
        skipSubmitReview: false,
        skipReview: undefined,
        deployPercentage: undefined,
        publishType: undefined,
        cancelPending: false,
      },
      firefox: {
        ...config.firefox,
        channel: 'listed' as const,
        skipSubmitReview: false,
      },
      edge: {
        ...config.edge,
        skipSubmitReview: false,
      },
      opera: {
        ...config.opera,
        skipSubmitReview: false,
      },
      safari: {
        ...config.safari,
        bundleType: 'macos' as const,
      },
    } as ResolvedConfig;

    const actual = resolveConfig(config);

    expect(actual).toEqual(expected);
  });

  it('should exclude chrome, firefox, edge, opera and safari objects when their zip/bundlePath option is not passed', () => {
    const config: InlineConfig = {
      dryRun: false,
      chrome: {
        clientId: 'clientId',
      },
      firefox: {
        jwtIssuer: 'jwtIssuer',
      },
      edge: {
        clientId: 'clientId',
      },
      opera: {
        packageId: 1,
      },
      safari: {
        apiKeyId: 'keyId',
      },
    };
    const expected: ResolvedConfig = {
      dryRun: false,
      chrome: undefined,
      edge: undefined,
      firefox: undefined,
      opera: undefined,
      safari: undefined,
    };

    const actual = resolveConfig(config);

    expect(actual).toEqual(expected);
  });
});

describe('validateConfig', () => {
  it('should report an error if a required config is missing, error message should report the missing config', () => {
    const config: InlineConfig = {
      dryRun: true,
      chrome: {
        apiVersion: 'v2',
        extensionId: ' ',
      },
    };
    expect(() => validateConfig(config)).toThrowError(
      'Invalid config:\n  - \u001B[36mchrome.zip\u001B[39m: Expected a string, but received: undefined\n  - \u001B[36mchrome.extensionId\u001B[39m: Expected a nonempty string but received an empty one\n  - \u001B[36mchrome.publisherId\u001B[39m: Expected a string, but received: undefined\n  - \u001B[36mchrome.serviceAccountClientEmail\u001B[39m: Expected a string, but received: undefined\n  - \u001B[36mchrome.serviceAccountPrivateKey\u001B[39m: Expected a string, but received: undefined',
    );
  });
});
