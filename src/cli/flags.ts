/**
 * Represents the value of args in commands
 */
export interface Flags {
  '--': string[];
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

export function snakeToCamel(str: string): string {
  return str.toLowerCase().replace(/(_\w)/g, match => match[1].toUpperCase());
}

export function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, match => '-' + match[1]);
}
