import {
  ChromeWebStore,
  IStore,
  FirefoxAddonStore,
  PublishFailure,
  PublishSuccess,
  EdgeAddonStore,
} from './stores';
import { PublishOptions, Results, InternalPublishOptions } from './types';
import { Log } from './utils/log';

export type { PublishOptions, Results };

export function publishExtension(
  options: PublishOptions,
  deps = {
    chrome: ChromeWebStore,
    firefox: FirefoxAddonStore,
    edge: EdgeAddonStore,
    log: new Log(),
  },
): Promise<Results> {
  const internalOptions = mapToInternalOptions(options);

  return internalPublishExtension(internalOptions, deps);
}

async function internalPublishExtension(
  options: InternalPublishOptions,
  deps: {
    chrome: typeof ChromeWebStore;
    firefox: typeof FirefoxAddonStore;
    edge: typeof EdgeAddonStore;
    log: Log;
  },
): Promise<Results> {
  const { log } = deps;

  if (options.dryRun) {
    log.blankLine();
    log.error('DRY RUN');
  }

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
  if (options.edge) {
    const store = new deps.edge(options.edge, { log });
    log.printStoreOptions(store.name, options.edge);
    ops.push(['edge', store]);
  }

  // Publish
  log.printTitle('Publishing');
  const result: Results = {};
  for (const [key, store] of ops) {
    log.printSubtitle(`${store.name}...`);
    result[key] = await store
      .publish(options.dryRun)
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

function mapToInternalOptions(options: PublishOptions): InternalPublishOptions {
  return {
    dryRun: options.dryRun,
    chrome: options.chrome && {
      ...options.chrome,
      publishTarget: options.chrome.publishTarget ?? 'default',
      skipSubmitReview: options.chrome.skipSubmitReview ?? false,
    },
    firefox: options.firefox && {
      ...options.firefox,
      channel: options.firefox.channel ?? 'listed',
    },
    edge: options.edge && {
      ...options.edge,
      skipSubmitReview: options.edge.skipSubmitReview ?? false,
    },
  };
}
