import { resolveConfig, validateConfig, type InlineConfig } from '../config';
import { ChromeWebStoreV2 } from '../stores/chrome-web-store-v2';
import { logger } from '../utils/logger';

export async function setDeployPercentage(config: InlineConfig): Promise<void> {
  console.log();
  logger.info('Set CWS Deploy Percentage');

  if (config.dryRun)
    throw Error('Dry run is not supported when setting the deploy percentage');

  const { chrome: resolved } = validateConfig(resolveConfig(config));
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

  const store = new ChromeWebStoreV2(resolved, logger.success);
  await store.setDeploymentPercentage(resolved.deployPercentage);

  console.log();
  logger.success(`Deploy percentage set to ${resolved.deployPercentage}`);
  console.log();
}
