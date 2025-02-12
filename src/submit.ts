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

  if (
    internalConfig.edge?.clientSecret ||
    internalConfig.edge?.accessTokenUrl
  ) {
    consola.warn(
      [
        'Edge API v1.0 was deprecated Jan 1, 2025. v1.1 of the API requires different authentication. To upgrade:',
        '  1. Remove the `--edge-client-secret` or `EDGE_CLIENT_SECRET` environment variable',
        '  2. Remove the `--edge-access-token-url` or `EDGE_ACCESS_TOKEN_URL` environment variable',
        '  3. Follow the instructions below to add the `--edge-api-key` flag or `EDGE_API_KEY` environment variable',
        'Or run `publish-extension init` and re-initialize the edge store.',
        '',
        'To generate an API key:',
        '  1. Visit https://partner.microsoft.com/en-us/dashboard/microsoftedge/publishapi',
        '  2. Enable the v1.1 API if necessary',
        '  3. Create an new API key',
        '',
        'Refer to Microsoft API reference for more details: https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api?tabs=v1-1#overview-of-using-the-update-rest-api',
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
