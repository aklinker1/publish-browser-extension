import { Listr } from 'listr2';
import { ChromeWebStoreV1_1 } from '../stores/chrome-web-store-v1.1';
import { InlineConfig, resolveConfig, validateConfig } from '../config';
import { EdgeAddonStoreV1_1 } from '../stores/edge-addon-store-v1.1';
import { FirefoxAddonStoreV5 } from '../stores/firefox-addon-store-v5';
import { OperaAddonsStore } from '../stores/opera-addons-store';
import type { Store, SubmitResult } from '../stores/store';
import { consola } from 'consola';
import { ChromeWebStoreV2 } from '../stores/chrome-web-store-v2';

export async function submit(config: InlineConfig): Promise<SubmitResults> {
  // Setup

  const internalConfig = validateConfig(resolveConfig(config));

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
    const storeOptions = internalConfig.chrome;
    stores.push({
      id: 'chrome',
      name: 'Chrome Web Store',
      getStore: setStatus =>
        storeOptions.apiVersion === 'v2'
          ? new ChromeWebStoreV2(storeOptions, setStatus)
          : new ChromeWebStoreV1_1(storeOptions, setStatus),
    });
  }

  if (internalConfig.firefox) {
    const storeOptions = internalConfig.firefox;
    stores.push({
      id: 'firefox',
      name: 'Firefox Addon Store',
      getStore: setStatus => new FirefoxAddonStoreV5(storeOptions, setStatus),
    });
  }

  if (internalConfig.edge) {
    const storeOptions = internalConfig.edge;
    stores.push({
      id: 'edge',
      name: 'Edge Addon Store',
      getStore: setStatus => new EdgeAddonStoreV1_1(storeOptions, setStatus),
    });
  }

  if (internalConfig.opera) {
    const storeOptions = internalConfig.opera;
    stores.push({
      id: 'opera',
      name: 'Opera Addons',
      getStore: setStatus => new OperaAddonsStore(storeOptions!, setStatus),
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
    // Listr already logs the errors, just show a summary at the end
    throw Error(`Submissions failed: ${errors.length}`);
  }

  // Return the results

  return results;
}

export type SubmitResults = Partial<
  Record<keyof Omit<InlineConfig, 'dryRun'>, SubmitResult>
>;
