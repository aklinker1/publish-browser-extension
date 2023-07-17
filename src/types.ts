import {
  ChromeWebStoreOptions,
  FirefoxAddonStoreOptions,
  EdgeAddonStoreOptions,
  PublishResult,
} from './stores';

type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface PublishOptions {
  dryRun?: boolean;
  chrome?: OptionalFields<
    ChromeWebStoreOptions,
    'publishTarget' | 'skipSubmitReview'
  >;
  firefox?: OptionalFields<FirefoxAddonStoreOptions, 'channel'>;
  edge?: OptionalFields<EdgeAddonStoreOptions, 'skipSubmitReview'>;
}

export interface InternalPublishOptions {
  dryRun: boolean | undefined;
  chrome: ChromeWebStoreOptions | undefined;
  firefox: FirefoxAddonStoreOptions | undefined;
  edge: EdgeAddonStoreOptions | undefined;
}

export type Results = Partial<
  Record<keyof Omit<PublishOptions, 'dryRun'>, PublishResult>
>;
