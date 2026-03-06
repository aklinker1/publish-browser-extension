import { CwsApi, type FetchItemStatusResponse } from './chrome-api';
import consola from 'consola';

export interface ChromeStatusOptions {
  extensionId: string;
  publisherId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export async function chromeStatus(
  options: ChromeStatusOptions,
): Promise<FetchItemStatusResponse> {
  const api = new CwsApi(options);
  const token = await api.getToken();
  const status = await api.fetchStatus({
    extensionId: options.extensionId,
    token,
  });

  consola.info('Extension Status:');
  consola.log(JSON.stringify(status, null, 2));

  return status;
}
