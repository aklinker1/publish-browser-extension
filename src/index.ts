import {
  ChromeWebStore,
  IStore,
  FirefoxAddonStore,
  PublishFailure,
  PublishResult,
  PublishSuccess,
} from './stores';
import { PublishOptions, Result } from './types';
import { Log } from './utils/log';

export async function publishExtension(
  options: PublishOptions,
  deps = {
    chrome: ChromeWebStore,
    firefox: FirefoxAddonStore,
    log: new Log(),
  },
): Promise<Result> {
  const { log } = deps;

  // Build operations
  log.printTitle('Configuring publishers');
  const ops: [keyof PublishOptions, IStore][] = [];
  if (options.chrome) {
    const store = new deps.chrome(options.chrome, { log });
    log.printStoreOptions(store.name, options.chrome);
    ops.push(['chrome', store]);
  }
  if (options.firefox) {
    const store = new deps.firefox(options.firefox, { log });
    log.printStoreOptions(store.name, options.firefox);
    ops.push(['firefox', store]);
  }

  // Publish
  log.printTitle('Publishing');
  const result: Result = {};
  for (const [key, store] of ops) {
    log.printSubtitle(`${store.name}...`);
    result[key] = await store
      .publish()
      .then<PublishSuccess>(() => {
        log.success(`✔ ${store.name}`);
        return { success: true };
      })
      .catch<PublishFailure>(err => {
        log.printFailure(store.name, err);
        return { success: false, err };
      });
  }

  return result;
}
