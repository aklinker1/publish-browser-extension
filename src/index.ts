import { consola } from 'consola';
import {
  ChromeWebStore,
  IStore,
  FirefoxAddonStore,
  EdgeAddonStore,
} from './stores';
import { PublishOptions, Results, InternalPublishOptions } from './types';
import { Logger, printStoreOptions } from './utils/logger';
import { plural } from './utils/plural';

export type { PublishOptions, Results };

export function publishExtension(
  options: PublishOptions,
  deps = {
    chrome: ChromeWebStore,
    firefox: FirefoxAddonStore,
    edge: EdgeAddonStore,
    logger: consola,
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
    logger: Logger;
  },
): Promise<Results> {
  const { logger } = deps;
  const startTime = Date.now();
  console.log();
  logger.info('Publishing Web Extension');

  if (options.dryRun) {
    logger.warn('Dry run, skipping submission');
  }

  // Build operations
  const ops: [keyof Results, IStore][] = [];
  if (options.chrome) {
    const store = new deps.chrome(options.chrome, { logger });
    printStoreOptions(logger, store.name, options.chrome);
    ops.push(['chrome', store]);
  }
  if (options.firefox) {
    const store = new deps.firefox(options.firefox, { logger });
    printStoreOptions(logger, store.name, options.firefox);
    ops.push(['firefox', store]);
  }
  if (options.edge) {
    const store = new deps.edge(options.edge, { logger });
    printStoreOptions(logger, store.name, options.edge);
    ops.push(['edge', store]);
  }

  // Publish
  const result: Results = {};
  let hasFailed = false;

  console.log();
  logger.info(`Publishing to ${plural(ops.length, 'store')}`);
  const { default: ora } = await import('ora');
  for (const [key, store] of ops) {
    const spinner = ora({ indent: 2, text: store.name }).start();
    logger.pauseLogs();
    try {
      await store.publish(options.dryRun);
      result[key] = { success: true };
      spinner.succeed();
    } catch (err) {
      result[key] = { success: false, err };
      spinner.fail();
      logger.error(err);
      hasFailed = true;
    } finally {
      logger.resumeLogs();
    }
  }

  if (!hasFailed) {
    logger.info(`Published in ${Date.now() - startTime} ms`);
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
