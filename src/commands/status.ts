import consola from 'consola';
import { resolveConfig, type InlineConfig } from '../config';
import { ChromeWebStoreV2 } from '../stores/chrome-web-store-v2';

export async function status(config: InlineConfig): Promise<void> {
  console.log();
  consola.start('Get Published Status');

  if (config.dryRun)
    throw Error('Dry run is not supported when getting item status');

  const { chrome: resolved } = resolveConfig(config);
  if (!resolved)
    throw Error('Chrome options are required when getting item status');
  if (resolved.apiVersion !== 'v2')
    throw Error('Only v2 API is supported when getting item status');

  const store = new ChromeWebStoreV2(resolved, consola.success);
  const res = await store.getStatus();

  console.log();
  consola.info('Chrome');
  consola.log(
    `    Published item status: \`${res.publishedItemRevisionStatus ?? '<item not published>'}\``,
  );
  consola.log(
    `    Submitted item status: \`${res.submittedItemRevisionStatus ?? '<no submission in review>'}\``,
  );
  consola.debug(res);
  console.log();
}
