import {
  ChromeWebStoreOptions,
  FirefoxAddonStoreOptions,
  EdgeAddonStoreOptions,
  PublishResult,
} from './stores';

export interface PublishOptions {
  dryRun?: boolean;
  chrome?: ChromeWebStoreOptions;
  firefox?: FirefoxAddonStoreOptions;
  edge?: EdgeAddonStoreOptions;
}

export type Results = Partial<Record<keyof PublishOptions, PublishResult>>;
