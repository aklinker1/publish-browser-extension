import {
  ChromeWebStoreOptions,
  FirefoxAddonStoreOptions,
  PublishResult,
} from './stores';

export interface PublishOptions {
  dryRun?: boolean;
  chrome?: ChromeWebStoreOptions;
  firefox?: FirefoxAddonStoreOptions;
}

export type Results = Partial<Record<keyof PublishOptions, PublishResult>>;
