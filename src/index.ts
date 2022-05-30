import {
  ChromeWebStore,
  IStore,
  FirefoxAddonStore,
  PublishFailure,
} from './stores';
import { PublishOptions, Result } from './types';

export async function publishExtension(
  options: PublishOptions,
  stores = { chrome: ChromeWebStore, firefox: FirefoxAddonStore },
): Promise<Result> {
  // Build operations
  const ops: [keyof PublishOptions, IStore][] = [];
  options.chrome && ops.push(['chrome', new stores.chrome(options.chrome)]);
  options.firefox && ops.push(['firefox', new stores.firefox(options.firefox)]);

  // Publish
  const result: Result = {};
  for (const [key, store] of ops) {
    result[key] = await store.publish().catch(catchErr);
  }

  return result;
}

function catchErr(err: any): PublishFailure {
  return {
    success: false,
    err,
  };
}
