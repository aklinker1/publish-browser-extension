import { Listr } from 'listr2';
import { ChromeWebStore } from './chrome';
import { InlineConfig, resolveConfig } from './config';
import { EdgeAddonStore } from './edge';
import { FirefoxAddonStore } from './firefox';
import { Store, SubmitResult } from './utils/store';
import consola from 'consola';

export async function submit(config: InlineConfig): Promise<SubmitResults> {
  // Setup

  const internalConfig = resolveConfig(config);

  console.log('');
  consola.info('Publishing Extension');
  if (internalConfig.dryRun) {
    consola.warn('Dry run, skipping submission');
  }

  // Get list of stores that need released

  const stores: Array<{
    id: keyof SubmitResults;
    name: string;
    getStore: (setStatus: (text: string) => void) => Store;
  }> = [];
  if (internalConfig.chrome) {
    stores.push({
      id: 'chrome',
      name: 'Chrome Web Store',
      getStore: setStatus =>
        new ChromeWebStore(internalConfig.chrome!, setStatus),
    });
  }
  if (internalConfig.firefox) {
    stores.push({
      id: 'firefox',
      name: 'Firefox Addon Store',
      getStore: setStatus =>
        new FirefoxAddonStore(internalConfig.firefox!, setStatus),
    });
  }
  if (internalConfig.edge) {
    stores.push({
      id: 'edge',
      name: 'Edge Addon Store',
      getStore: setStatus =>
        new EdgeAddonStore(internalConfig.edge!, setStatus),
    });
  }

  if (stores.length === 0) {
    throw Error('No ZIP files detected to upload');
  }

  // Execute the tasks

  const results: SubmitResults = {};
  const tasks = new Listr(
    stores.map(({ id, name, getStore }) => ({
      title: name,
      async task(_ctx, task) {
        try {
          const setStatus = (text: string) => {
            task.output = `[${id}] ${text}`;
          };
          const store = getStore(setStatus);

          setStatus('Checking ZIP files exist');
          await store.ensureZipsExist();
          await store.submit(internalConfig.dryRun);
          results[id] = { success: true };
        } catch (err) {
          consola.error(err);
          results[id] = { success: false, err: err };
          throw err;
        }
      },
    })),
    {
      exitOnError: false,
      collectErrors: 'minimal',
      concurrent: true,
    },
  );
  await tasks.run();

  // Check for errors

  const errors = Object.entries(results).filter(([_id, result]) => {
    return !result.success;
  });
  if (errors.length > 0) {
    throw Error(`Submissions failed: ${errors.length}`, { cause: errors });
  }

  // Return the results

  return results;
}

export type SubmitResults = Partial<
  Record<keyof Omit<InlineConfig, 'dryRun'>, SubmitResult>
>;
