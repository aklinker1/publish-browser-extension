import { CwsApi } from './chrome-api';
import consola from 'consola';

export interface ChromeSetDeployPercentageOptions {
  extensionId: string;
  publisherId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  deployPercentage: number;
}

export async function chromeSetDeployPercentage(
  options: ChromeSetDeployPercentageOptions,
): Promise<void> {
  const api = new CwsApi(options);
  const token = await api.getToken();
  await api.setPublishedDeployPercentage({
    extensionId: options.extensionId,
    token,
    deployPercentage: options.deployPercentage,
  });

  consola.success(`Deploy percentage set to ${options.deployPercentage}%`);
}
