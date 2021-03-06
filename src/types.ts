import {
  ChromeWebStoreOptions,
  FirefoxAddonStoreOptions,
  PublishResult,
} from './stores';

export interface PublishOptions {
  chrome?: ChromeWebStoreOptions;
  firefox?: FirefoxAddonStoreOptions;
}

export type Results = Partial<Record<keyof PublishOptions, PublishResult>>;
