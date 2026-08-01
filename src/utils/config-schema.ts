import {
  object,
  optional,
  literal,
  Struct,
  nonempty,
  string,
  number,
  min,
  max,
  enums,
  boolean,
  coerce,
  union,
  type Infer,
  dynamic,
  array,
  trimmed,
  defaulted,
  partial,
} from 'superstruct';
import type { DeepPartial } from './types';

export interface MetaStruct<T> extends Struct<T> {
  '~meta': {
    description: string;
    path: string;
    note?: string;
  };
}

function meta<T>(
  struct: Struct<T>,
  options: { path: string; description: string; note?: string },
): MetaStruct<T> {
  const s = struct as MetaStruct<T>;
  s['~meta'] = {
    path: options.path,
    description: options.description,
    note: options.note,
  };
  return s;
}

export function isMetaStruct<T>(struct: Struct<T>): struct is MetaStruct<T> {
  return (struct as any)['~meta'];
}

const stringbool = coerce(
  boolean(),
  union([literal('true'), literal('false'), boolean()]),
  v => {
    if (v === 'true') return true;
    if (v === 'false') return false;
    return v;
  },
);

const coercedNumber = coerce(number(), union([string(), number()]), v => {
  if (typeof v === 'string') return parseFloat(v);
  return v;
});

const commaArray = <T>(struct: Struct<T>) =>
  coerce(array(struct), string(), v => v.split(','));

const deepPartial = <T extends Record<string, any>>(
  struct: Struct<T>,
): Struct<DeepPartial<T>> => {
  if (struct.type !== 'object') return struct as any;

  // @ts-expect-error: Weird schema type error
  const partialSchema: any = { ...struct.schema };
  for (const key in partialSchema) {
    partialSchema[key] = deepPartial(partialSchema[key]);
  }
  return partial(partialSchema) as any;
};

const ChromeWebStoreSharedOptionsShape = {
  zip: meta(nonempty(string()), {
    path: 'chrome.zip',
    description: 'Path to extension zip to upload',
  }),
  deployPercentage: meta(optional(min(max(coercedNumber, 100), 0)), {
    path: 'chrome.deployPercentage',
    description: 'An integer from 0-100',
  }),
  extensionId: meta(nonempty(trimmed(string())), {
    path: 'chrome.extensionId',
    description: 'The ID of the extension to be submitted',
  }),
  skipSubmitReview: meta(defaulted(stringbool, false), {
    path: 'chrome.skipSubmitReview',
    description:
      "Just upload the extension zip, don't submit it for review or publish it",
  }),
};

/** @deprecated Will be removed October 15th, 2026, when the CWS API v1.1 is shut down. */
export const ChromeWebStoreV1_1Options = object({
  apiVersion: meta(optional(literal('v1.1')), {
    path: 'chrome.apiVersion',
    description:
      'The API version to use for the Chrome Web Store: "v1.1" or "v2"',
  }),
  ...ChromeWebStoreSharedOptionsShape,
  clientId: meta(nonempty(trimmed(string())), {
    path: 'chrome.clientId',
    note: 'Deprecated: API v1.1 only',
    description:
      'Client ID used for authorizing requests to the Chrome Web Store',
  }),
  clientSecret: meta(nonempty(trimmed(string())), {
    path: 'chrome.clientSecret',
    note: 'Deprecated: API v1.1 only',
    description:
      'Client secret used for authorizing requests to the Chrome Web Store',
  }),
  refreshToken: meta(nonempty(trimmed(string())), {
    path: 'chrome.refreshToken',
    note: 'Deprecated: API v1.1 only',
    description:
      'Refresh token used for authorizing requests to the Chrome Web Store',
  }),
  publishTarget: meta(optional(enums(['default', 'trustedTesters'])), {
    path: 'chrome.publishTarget',
    note: 'Deprecated: API v1.1 only',
    description: 'Group to publish to, "default" or "trustedTesters"',
  }),
  reviewExemption: meta(optional(stringbool), {
    path: 'chrome.reviewExemption',
    note: 'Deprecated: API v1.1 only',
    description: 'Submit update using expedited review process',
  }),
});

/** @deprecated Will be removed October 15th, 2026, when the CWS API v1.1 is shut down. */
export type ChromeWebStoreV1_1Options = Infer<typeof ChromeWebStoreV1_1Options>;

export const ChromeWebStoreV2Options = object({
  apiVersion: meta(literal('v2'), {
    path: 'chrome.apiVersion',
    description:
      'The API version to use for the Chrome Web Store: "v1.1" or "v2"',
  }),
  ...ChromeWebStoreSharedOptionsShape,
  publisherId: meta(nonempty(trimmed(string())), {
    path: 'chrome.publisherId',
    note: 'API v2 only',
    description: 'Publisher ID who owns the extension',
  }),
  serviceAccountClientEmail: meta(nonempty(trimmed(string())), {
    path: 'chrome.serviceAccountClientEmail',
    note: 'API v2 only',
    description:
      'Client email of the service account used for authorizing requests to the Chrome Web Store',
  }),
  serviceAccountPrivateKey: meta(nonempty(trimmed(string())), {
    path: 'chrome.serviceAccountPrivateKey',
    note: 'API v2 only',
    description:
      'Private key of the service account used for authorizing requests to the Chrome Web Store',
  }),
  publishType: meta(
    optional(
      enums(['PUBLISH_TYPE_UNSPECIFIED', 'DEFAULT_PUBLISH', 'STAGED_PUBLISH']),
    ),
    {
      path: 'chrome.publishType',
      note: 'API v2 only',
      description:
        'Set to "STAGED_PUBLISH" to not publish the extension immediately after submission',
    },
  ),
  skipReview: meta(optional(stringbool), {
    path: 'chrome.skipReview',
    note: 'API v2 only',
    description:
      'Some updates, like ad-blocker rule updates, can skip the review process and be published immediately after submission',
  }),
  cancelPending: meta(defaulted(stringbool, false), {
    path: 'chrome.cancelPending',
    note: 'API v2 only',
    description: 'Cancel any pending review before submitting the new version',
  }),
});

export type ChromeWebStoreV2Options = Infer<typeof ChromeWebStoreV2Options>;

/** @deprecated Will be removed October 15th, 2026, when the CWS API v1.1 is shut down. */
export type AllChromeOptions = {
  [
    key in keyof ChromeWebStoreV1_1Options | keyof ChromeWebStoreV2Options
  ]: key extends keyof ChromeWebStoreV1_1Options
    ? ChromeWebStoreV1_1Options[key]
    : key extends keyof ChromeWebStoreV2Options
      ? ChromeWebStoreV2Options[key]
      : never;
};

export const FirefoxAddonStoreV5Options = object({
  zip: meta(nonempty(string()), {
    path: 'firefox.zip',
    description: 'Path to extension zip to upload',
  }),
  sourcesZip: meta(optional(nonempty(string())), {
    path: 'firefox.sourcesZip',
    description: 'Path to sources zip to upload',
  }),
  extensionId: meta(nonempty(trimmed(string())), {
    path: 'firefox.extensionId',
    description: 'The ID of the extension to be submitted',
  }),
  jwtIssuer: meta(nonempty(trimmed(string())), {
    path: 'firefox.jwtIssuer',
    description: 'Issuer used for authorizing requests to Addon Store APIs',
  }),
  jwtSecret: meta(nonempty(trimmed(string())), {
    path: 'firefox.jwtSecret',
    description: 'Secret used for authorizing requests to Addon Store APIs',
  }),
  channel: meta(defaulted(enums(['listed', 'unlisted']), 'listed'), {
    path: 'firefox.channel',
    description: 'The channel to publish to, "listed" or "unlisted"',
  }),
  compatibility: meta(optional(commaArray(enums(['firefox', 'android']))), {
    path: 'firefox.compatibility',
    description:
      'Comma-separated list of compatible applications, e.g. "firefox,android" - "firefox" for compatibility with Firefox desktop apps, "android" for Firefox Android apps',
  }),
  skipSubmitReview: meta(defaulted(stringbool, false), {
    path: 'firefox.skipSubmitReview',
    description:
      "Just upload the extension zip, don't submit it for review or publish it",
  }),
});

export type FirefoxAddonStoreV5Options = Infer<
  typeof FirefoxAddonStoreV5Options
>;

export const EdgeAddonStoreV1_1Options = object({
  zip: meta(nonempty(string()), {
    path: 'edge.zip',
    description: 'Path to extension zip to upload',
  }),
  productId: meta(nonempty(trimmed(string())), {
    path: 'edge.productId',
    description: 'Product ID listed on the developer dashboard',
  }),
  clientId: meta(nonempty(trimmed(string())), {
    path: 'edge.clientId',
    description:
      'Client ID used for authorizing requests to Microsofts addon API',
  }),
  apiKey: meta(nonempty(trimmed(string())), {
    path: 'edge.apiKey',
    description:
      'API key used for authorizing requests to Microsofts addon API v1.1',
  }),
  skipSubmitReview: meta(defaulted(stringbool, false), {
    path: 'edge.skipSubmitReview',
    description:
      "Just upload the extension zip, don't submit it for review or publish it",
  }),
});

export type EdgeAddonStoreV1_1Options = Infer<typeof EdgeAddonStoreV1_1Options>;

export const OperaAddonsStoreOptions = object({
  zip: meta(nonempty(string()), {
    path: 'opera.zip',
    description: 'Path to extension zip to upload',
  }),
  packageId: meta(coercedNumber, {
    path: 'opera.packageId',
    description:
      'Package ID listed in the package developer URL: https://addons.opera.com/developer/package/<packageId>',
  }),
  sessionId: meta(nonempty(trimmed(string())), {
    path: 'opera.sessionId',
    description: 'Session ID used for authorizing requests to Opera Addons API',
  }),
  skipSubmitReview: meta(defaulted(stringbool, false), {
    path: 'opera.skipSubmitReview',
    description:
      "Just upload the extension zip, don't submit it for review or publish it",
  }),
});

export type OperaAddonsStoreOptions = Infer<typeof OperaAddonsStoreOptions>;

export const SafariAddonStoreOptions = object({
  bundlePath: meta(nonempty(string()), {
    path: 'safari.bundlePath',
    description: 'Path to the .pkg (macOS) or .ipa (iOS) bundle to upload',
  }),
  bundleType: meta(defaulted(enums(['macos', 'ios', 'osx']), 'macos'), {
    path: 'safari.bundleType',
    description:
      'The type of bundle being uploaded: "macos", "ios", or "osx" (default: "macos")',
  }),
  apiKeyId: meta(nonempty(trimmed(string())), {
    path: 'safari.apiKeyId',
    description: 'App Store Connect API Key ID',
  }),
  apiIssuerId: meta(nonempty(trimmed(string())), {
    path: 'safari.apiIssuerId',
    description: 'App Store Connect API Issuer ID',
  }),
  apiPrivateKeyPath: meta(nonempty(trimmed(string())), {
    path: 'safari.apiPrivateKeyPath',
    description: 'Path to the .p8 App Store Connect API private key file',
  }),
});

export type SafariAddonStoreOptions = Infer<typeof SafariAddonStoreOptions>;

export const ResolvedConfig = object({
  dryRun: meta(defaulted(stringbool, false), {
    path: 'dryRun',
    description:
      "Check authentication, but don't upload the zip or submit for review",
  }),
  chrome: optional(
    dynamic<ChromeWebStoreV1_1Options | ChromeWebStoreV2Options>(v =>
      (v as any)?.apiVersion === 'v2'
        ? (ChromeWebStoreV2Options as any)
        : (ChromeWebStoreV1_1Options as any),
    ),
  ),
  firefox: optional(FirefoxAddonStoreV5Options),
  edge: optional(EdgeAddonStoreV1_1Options),
  opera: optional(OperaAddonsStoreOptions),
  safari: optional(SafariAddonStoreOptions),
});

export type ResolvedConfig = Infer<typeof ResolvedConfig>;

export const PartialResolvedConfig = deepPartial(ResolvedConfig);

export type PartialResolvedConfig = Infer<typeof PartialResolvedConfig>;

export type InlineConfig = DeepPartial<ResolvedConfig>;
