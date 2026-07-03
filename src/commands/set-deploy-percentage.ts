import consola from 'consola';
import { resolveConfig, type InlineConfig } from '../config';
import { ChromeWebStoreV2 } from '../stores/chrome-web-store-v2';

export async function setDeployPercentage(config: InlineConfig): Promise<void> {
  console.log();
  consola.info('Set CWS Deploy Percentage');

  if (config.dryRun)
    throw Error('Dry run is not supported when setting the deploy percentage');

  const { chrome: resolved } = resolveConfig(config);
  if (!resolved)
    throw Error(
      'Chrome options are required when setting the deploy percentage',
    );

  if (resolved.deployPercentage == null)
    throw Error(
      'Deploy percentage is required when setting the deploy percentage',
    );

  if (resolved.apiVersion !== 'v2')
    throw Error('Only v2 API is supported when setting the deploy percentage');

  const store = new ChromeWebStoreV2(resolved, consola.success);
  await store.setDeploymentPercentage(resolved.deployPercentage);

  console.log();
  consola.success(`Deploy percentage set to ${resolved.deployPercentage}`);
  console.log();
}
