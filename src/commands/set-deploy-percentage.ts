import consola from 'consola';
import { resolveChromeV2Options, type InlineConfig } from '../config';
import {
  ChromeWebStoreV2,
  ChromeWebStoreV2Options,
} from '../stores/chrome-web-store-v2';

export async function setDeployPercentage(config: InlineConfig): Promise<void> {
  console.log('');
  consola.info('Set CWS Deploy Percentage');

  if (config.dryRun)
    throw Error('Dry run is not supported when setting the deploy percentage');

  const resolved = ChromeWebStoreV2Options.parse(
    resolveChromeV2Options(
      '...',
      (config.chrome ?? {}) as ChromeWebStoreV2Options,
    ),
  );

  if (resolved.deployPercentage == null)
    throw Error(
      'Deploy percentage is required when setting the deploy percentage',
    );

  const store = new ChromeWebStoreV2(resolved, consola.success);
  await store.setDeploymentPercentage(resolved.deployPercentage);

  consola.success(`Deploy percentage set to ${resolved.deployPercentage}`);
}
