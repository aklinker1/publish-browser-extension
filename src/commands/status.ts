import { resolveConfig, validateConfig, type InlineConfig } from '../config';
import { ChromeWebStoreV2 } from '../stores/chrome-web-store-v2';
import { highlight, logger } from '../utils/logger';

export async function status(config: InlineConfig): Promise<void> {
  console.log();
  logger.start('Get Published Status');

  if (config.dryRun)
    throw Error('Dry run is not supported when getting item status');

  const { chrome: resolved } = validateConfig(resolveConfig(config));
  if (!resolved)
    throw Error('Chrome options are required when getting item status');
  if (resolved.apiVersion !== 'v2')
    throw Error('Only v2 API is supported when getting item status');

  const store = new ChromeWebStoreV2(resolved, logger.success);
  const res = await store.getStatus();

  console.log();
  logger.info('Chrome');
  logger.log(
    `    Published item status: ${highlight(res.publishedItemRevisionStatus?.state ?? '<item not published>')}`,
  );
  logger.log(
    `    Submitted item status: ${highlight(res.submittedItemRevisionStatus?.state ?? '<no submission in review>')}`,
  );

  console.log();
}
