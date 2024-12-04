import { Listr } from 'listr2';
import { ChromeWebStore } from './chrome';
import { InlineConfig, resolveConfig, validateConfig } from './config';
import { EdgeAddonStore } from './edge';
import { FirefoxAddonStore } from './firefox';
import { Store, SubmitResult } from './utils/store';
import consola from 'consola';

export async function submit(config: InlineConfig): Promise<SubmitResults> {
  // Setup

  const internalConfig = validateConfig(resolveConfig(config));

  console.log('');
  consola.info('Publishing Extension');
  if (internalConfig.dryRun) {
    consola.warn('Dry run, skipping submission');
  }

  if (internalConfig.edge?.apiVersion === '1.0') {
    consola.warn(
      [
        'Edge API v1.0 will stop working Jan 1, 2025. To upgrade to v1.1:',
        '  1. Pass the new CLI flag (`--edge-api-version 1.1`) or set the environment variable (`EDGE_API_VERSION=1.1`) to opt into the new version',
        '  2. Replace the client secret/access token URL with an API key (`--edge-api-key` flag or `EDGE_API_KEY` environment variable)',
        '  3. Stop passing in a client secret and access token URL',
        'Or run `publish-extension init` and re-initialize the edge store for API v1.1.',
      ].join('\n'),
    );
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
