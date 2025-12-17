import { describe, it, expect, beforeEach } from 'bun:test';
import {
  InlineConfig,
  InternalConfig,
  resolveConfig,
  validateConfig,
} from './config';

const RESET_ENV_NAMES = /(^CHROME_|^FIREFOX_|^EDGE_|^DRY_RUN$)/;

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
        zip: 'zip',
        extensionId: 'extensionId',
        publisherId: 'publisherId',
        clientId: 'clientId',
        clientSecret: 'clientSecret',
        refreshToken: 'refreshToken',
        deployPercentage: 50,
        skipSubmitReview: true,
        cancelPending: true,
        skipReview: true,
        publishType: 'STAGED_PUBLISH',
      },
      firefox: {
        jwtIssuer: 'jwtIssuer',
        jwtSecret: 'jwtSecret',
        extensionId: 'extensionId',
        channel: 'unlisted',
        zip: 'zip',
        sourcesZip: 'sourcesZip',
      },
      edge: {
        productId: 'productId',
        clientId: 'clientId',
        apiKey: 'apiKey',
        accessTokenUrl: 'accessTokenUrl',
        clientSecret: 'clientSecret',
        skipSubmitReview: true,
        zip: 'zip',
      },
    } satisfies InternalConfig;

    const actual = resolveConfig(config);

    expect(actual).toEqual(config);
  });

  it('should fallback to environment variables even if config is empty', () => {
    const dryRun = true;
    process.env.DRY_RUN = String(dryRun);

    process.env.CHROME_ZIP = 'CHROME_ZIP';
    process.env.CHROME_EXTENSION_ID = 'CHROME_EXTENSION_ID';
    process.env.CHROME_PUBLISHER_ID = 'CHROME_PUBLISHER_ID';
    process.env.CHROME_CLIENT_ID = 'CHROME_CLIENT_ID';
    process.env.CHROME_CLIENT_SECRET = 'CHROME_CLIENT_SECRET';
    process.env.CHROME_REFRESH_TOKEN = 'CHROME_REFRESH_TOKEN';
    const chromeSkipSubmitReview = true;
    process.env.CHROME_SKIP_SUBMIT_REVIEW = String(chromeSkipSubmitReview);
    const chromeCancelPending = true;
    process.env.CHROME_CANCEL_PENDING = String(chromeCancelPending);
    const chromeSkipReview = true;
    process.env.CHROME_SKIP_REVIEW = String(chromeSkipReview);
    const chromePublishType = 'STAGED_PUBLISH';
    process.env.CHROME_PUBLISH_TYPE = chromePublishType;
    const chromeDeployPercentage = 75;
    process.env.CHROME_DEPLOY_PERCENTAGE = String(chromeDeployPercentage);

    process.env.FIREFOX_ZIP = 'FIREFOX_ZIP';
    process.env.FIREFOX_SOURCES_ZIP = 'FIREFOX_SOURCES_ZIP';
    process.env.FIREFOX_EXTENSION_ID = 'FIREFOX_EXTENSION_ID';
    process.env.FIREFOX_JWT_ISSUER = 'FIREFOX_JWT_ISSUER';
    process.env.FIREFOX_JWT_SECRET = 'FIREFOX_JWT_SECRET';
    const firefoxChannel = 'unlisted';
    process.env.FIREFOX_CHANNEL = firefoxChannel;

    process.env.EDGE_ZIP = 'EDGE_ZIP';
    process.env.EDGE_PRODUCT_ID = 'EDGE_PRODUCT_ID';
    process.env.EDGE_CLIENT_ID = 'EDGE_CLIENT_ID';
    process.env.EDGE_API_KEY = 'EDGE_API_KEY';
    process.env.EDGE_CLIENT_SECRET = 'EDGE_CLIENT_SECRET';
    process.env.EDGE_ACCESS_TOKEN_URL = 'EDGE_ACCESS_TOKEN_URL';
    const edgeSkipSubmitReview = true;
    process.env.EDGE_SKIP_SUBMIT_REVIEW = String(edgeSkipSubmitReview);

    const expected: InternalConfig = {
      dryRun,
      chrome: {
        zip: process.env.CHROME_ZIP!,
        extensionId: process.env.CHROME_EXTENSION_ID!,
        publisherId: process.env.CHROME_PUBLISHER_ID!,
        clientId: process.env.CHROME_CLIENT_ID!,
        clientSecret: process.env.CHROME_CLIENT_SECRET!,
        refreshToken: process.env.CHROME_REFRESH_TOKEN!,
        deployPercentage: chromeDeployPercentage,
        skipSubmitReview: chromeSkipSubmitReview,
        cancelPending: chromeCancelPending,
        skipReview: chromeSkipReview,
        publishType: chromePublishType,
      },
      firefox: {
        zip: process.env.FIREFOX_ZIP,
        sourcesZip: process.env.FIREFOX_SOURCES_ZIP,
        channel: firefoxChannel,
        extensionId: process.env.FIREFOX_EXTENSION_ID,
        jwtIssuer: process.env.FIREFOX_JWT_ISSUER,
        jwtSecret: process.env.FIREFOX_JWT_SECRET,
      },
      edge: {
        zip: process.env.EDGE_ZIP,
        productId: process.env.EDGE_PRODUCT_ID,
        clientId: process.env.EDGE_CLIENT_ID,
        apiKey: process.env.EDGE_API_KEY,
        accessTokenUrl: process.env.EDGE_ACCESS_TOKEN_URL,
        clientSecret: process.env.EDGE_CLIENT_SECRET,
        skipSubmitReview: edgeSkipSubmitReview,
      },
    };

    const actual = resolveConfig({});
    expect(actual).toEqual(expected);
  });

  it('should apply defaults', () => {
    const config: InlineConfig = {
      chrome: {
        zip: 'zip',
        extensionId: 'extensionId',
        publisherId: 'publisherId',
        clientId: 'clientId',
        clientSecret: 'clientSecret',
        refreshToken: 'refreshToken',
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
        clientSecret: 'clientSecret',
        productId: 'productId',
        accessTokenUrl: 'accessTokenUrl',
        apiKey: 'apiKey',
        zip: 'zip',
      },
    };

    const expected = {
      ...config,
      dryRun: false,
      chrome: {
        ...config.chrome,
        skipSubmitReview: false,
        cancelPending: false,
        skipReview: false,
        deployPercentage: undefined,
        publishType: 'DEFAULT_PUBLISH' as const,
      },
      firefox: {
        ...config.firefox,
        channel: 'listed' as const,
      },
      edge: {
        ...config.edge,
        skipSubmitReview: false,
      },
    };

    const actual = resolveConfig(config);

    expect(actual).toEqual(expected);
  });

  it('should exclude chrome, firefox, and edge objects when their zip option is not passed', () => {
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
    };
    const expected: InternalConfig = {
      dryRun: false,
      chrome: undefined,
      edge: undefined,
      firefox: undefined,
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
        clientId: 'clientId',
      },
    };
    expect(() => validateConfig(config)).toThrowError(
      'Missing required config: CHROME_ZIP, CHROME_EXTENSION_ID, CHROME_PUBLISHER_ID, CHROME_CLIENT_SECRET, CHROME_REFRESH_TOKEN',
    );
  });
});
