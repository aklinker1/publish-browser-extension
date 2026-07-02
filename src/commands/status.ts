import consola from 'consola';
import { resolveChromeV2Options, type InlineConfig } from '../config';
import {
  ChromeWebStoreV2,
  ChromeWebStoreV2Options,
} from '../stores/chrome-web-store-v2';

export async function status(config: InlineConfig): Promise<void> {
  console.log();
  consola.start('Get Published Status');

  if (config.dryRun)
    throw Error('Dry run is not supported when getting item status');

  const resolved = ChromeWebStoreV2Options.parse(
    resolveChromeV2Options(
      '...',
      (config.chrome ?? {}) as ChromeWebStoreV2Options,
    ),
  );

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
