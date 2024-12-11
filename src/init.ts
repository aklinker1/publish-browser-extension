import consola from 'consola';
import { InlineConfig, resolveConfig } from './config';
import { copyFile, writeFile, readFile } from 'node:fs/promises';
import { ChromeWebStoreOptions } from './chrome';
import { FirefoxAddonStoreOptions } from './firefox';
import { EdgeAddonStoreOptions } from './edge';
import { ofetch } from 'ofetch';

type Entry = [key: string, value: any];

const envFile = '.env.submit';

export async function init(config: InlineConfig) {
  consola.info(`Initialize or update an existing \`${envFile}\` file.`);

  const previousConfig = resolveConfig(config);

  // Types are wrong? This actually returns a Promise<string[]>
  const stores = await prompt<string[]>(
    'What stores do you want to configure?',
    {
      type: 'multiselect',
      options: [
        { value: 'chrome', label: 'Chrome Web Store' },
        { value: 'firefox', label: 'Firefox Addon Store' },
        { value: 'edge', label: 'Edge Addon Store' },
      ],
      required: false,
    },
  );

  const replacements: Entry[] = [];
  if (stores?.includes('chrome')) {
    replacements.push(...(await initChrome(previousConfig.chrome)));
  }
  if (stores?.includes('firefox')) {
    replacements.push(...(await initFirefox(previousConfig.firefox)));
  }
  if (stores?.includes('edge')) {
    replacements.push(...(await initEdge(previousConfig.edge)));
  }

  await updateEnvFile(replacements);
  console.log();
  consola.log(
    'To submit an update, run:\n\n  `publish-extension --chrome-zip path/to/extension.zip \\`\n    `--firefox-zip path/to/extension.zip \\`\n    `--edge-zip path/to/extension.zip`',
  );
}

async function prompt<T>(
  message: Parameters<typeof consola.prompt>[0],
  options: Parameters<typeof consola.prompt>[1],
  previousValue?: any,
): Promise<T> {
  const result = await consola.prompt(message, {
    default: previousValue,
    placeholder: previousValue,
    ...options,
  });
  // When canceling, a symbol is returned instead of the value.
  if (typeof result === 'symbol') {
    throw Error('Canceled');
  }
  return result as T;
}

async function initChrome(
  previousOptions: Partial<ChromeWebStoreOptions> | undefined,
): Promise<Entry[]> {
  const entries: Entry[] = [];

  console.log();
  consola.start('Chrome Web Store\n');

  consola.log('`--chrome-extension-id` can be found:');
  consola.log('  1. Under the extension name in the CWS developer console');
  consola.log('  2. In the URL of the CWS page for the item');
  consola.log('Example: `ocfdgncpifmegplaglcnglhioflaimkd`');
  const extensionId = await prompt<string>(
    'Enter the extension ID:',
    {
      type: 'text',
    },
    previousOptions?.extensionId,
  );
  entries.push(['CHROME_EXTENSION_ID', extensionId]);

  console.log();
  consola.log(
    '`--chrome-client-id` and `--chrome-client-secret` are generated by following the "Initial Setup" from:',
  );
  console.log('https://developer.chrome.com/docs/webstore/using-api#setup');
  const clientId = await prompt<string>(
    'Enter your client ID:',
    { type: 'text' },
    previousOptions?.clientId,
  );
  entries.push(['CHROME_CLIENT_ID', clientId]);
  const clientSecret = await prompt<string>(
    'Enter your client secret:',
    { type: 'text' },
    previousOptions?.clientSecret,
  );
  entries.push(['CHROME_CLIENT_SECRET', clientSecret]);

  const generateRefreshToken = await prompt<boolean>(
    'Generate new refresh token?',
    { type: 'confirm' },
  );
  if (generateRefreshToken) {
    const authCodeUrl = `https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=${clientId}&redirect_uri=urn:ietf:wg:oauth:2.0:oob`;
    consola.log(authCodeUrl);
    const authCode = await consola.prompt(
      'Open the above URL, login, and enter the auth code:',
      {
        type: 'text',
        required: true,
      },
    );
    const data = new URLSearchParams();
    data.set('client_id', clientId);
    data.set('client_secret', clientSecret);
    data.set('code', authCode);
    data.set('grant_type', 'authorization_code');
    data.set('redirect_uri', 'urn:ietf:wg:oauth:2.0:oob');
    const tokenUrl = `https://accounts.google.com/o/oauth2/token`;
    const res = await ofetch<{ refresh_token: string }>(tokenUrl, {
      method: 'POST',
      body: data,
    });
    const refreshToken = res.refresh_token;
    consola.info(`Refresh token: \`${refreshToken}\``);
    entries.push(['CHROME_REFRESH_TOKEN', refreshToken]);
  }

  const publishTarget = await prompt<string>(
    '`--chrome-publish-target`: Where do you want to release to?',
    {
      type: 'select',
      options: [
        {
          label: 'Default',
          value: 'default',
          hint: 'Public release channel',
        },
        {
          label: 'Trusted Testers',
          value: 'trustedTesters',
          hint: 'Prerelease, internal channel',
        },
      ],
      initial: previousOptions?.publishTarget,
    },
    previousOptions?.publishTarget,
  );
  entries.push(['CHROME_PUBLISH_TARGET', publishTarget]);

  const submitForReview = await prompt<boolean>(
    'When uploading, automatically submit new update for review?',
    { type: 'confirm' },
    !previousOptions?.skipSubmitReview,
  );
  entries.push(['CHROME_SKIP_SUBMIT_REVIEW', !submitForReview]);

  return entries;
}

async function initFirefox(
  previousOptions: Partial<FirefoxAddonStoreOptions> | undefined,
): Promise<Entry[]> {
  const entries: Entry[] = [];

  console.log();
  consola.start('Firefox Addon Store\n');

  consola.info(
    'Your `--firefox-extension-id` is listed at the bottom of the details page on:',
  );
  console.log('https://addons.mozilla.org/en-US/developers/');
  const extensionId = await prompt(
    'Enter extension ID:',
    {
      type: 'text',
    },
    previousOptions?.extensionId,
  );
  entries.push(['FIREFOX_EXTENSION_ID', extensionId]);

  console.log();
  consola.log(
    '`--firefox-jwt-issuer` and `--firefox-jwt-secret` are available at:',
  );
  console.log('https://addons.mozilla.org/developers/addon/api/key/');
  const jwtIssuer = await prompt<string>(
    'Enter your JWT issuer:',
    { type: 'text' },
    previousOptions?.jwtIssuer,
  );
  entries.push(['FIREFOX_JWT_ISSUER', jwtIssuer]);
  const jwtSecret = await prompt<string>(
    'Enter your JWT secret:',
    { type: 'text' },
    previousOptions?.jwtSecret,
  );
  entries.push(['FIREFOX_JWT_SECRET', jwtSecret]);

  const channel = await prompt<string>(
    '`--firefox-channel`: Which channel do you want to release to?',
    {
      type: 'select',
      options: [
        {
          label: 'Listed',
          value: 'listed',
          hint: 'Hosted on addons.mozilla.com',
        },
        { label: 'Unlisted', value: 'unlisted', hint: 'For self-hosting' },
      ],
      initial: previousOptions?.channel,
    },
    previousOptions?.channel,
  );
  entries.push(['FIREFOX_CHANNEL', channel]);

  return entries;
}

async function initEdge(
  previousOptions: Partial<EdgeAddonStoreOptions> | undefined,
): Promise<Entry[]> {
  const entries: Entry[] = [];

  console.log();
  consola.start('Edge Addon Store\n');

  consola.info(
    'Your `--edge-product-id` is listed On the developer dashboard, at the top of the page under the extension name',
  );
  console.log('https://partner.microsoft.com/dashboard/microsoftedge/overview');
  const productId = await prompt(
    'Enter product ID:',
    {
      type: 'text',
    },
    previousOptions?.productId,
  );
  entries.push(['EDGE_PRODUCT_ID', productId]);

  console.log();
  consola.log(
    '`--edge-client-id` and either `--edge-api-key` (API v1.1) or `--edge-client-secret` and `--edge-access-token-url` (API v1.0) can be created following:',
  );
  console.log(
    'https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api#before-you-begin',
  );
  const clientId = await prompt<string>(
    'Enter your client ID:',
    { type: 'text' },
    previousOptions?.clientId,
  );
  entries.push(['EDGE_CLIENT_ID', clientId]);
  const apiVersion = await prompt<string>(
    'Enter the API version you will use:',
    {
      type: 'select',
      options: ['1.1', '1.0'],
    },
    previousOptions?.apiVersion,
  );
  entries.push(['EDGE_API_VERSION', apiVersion]);

  if (apiVersion === '1.1') {
    const apiKey = await prompt<string>(
      'Enter your API key:',
      { type: 'text' },
      previousOptions?.apiVersion === '1.1'
        ? previousOptions.apiKey
        : undefined,
    );
    entries.push(['EDGE_API_KEY', apiKey]);
  } else {
    const clientSecret = await prompt<string>(
      'Enter your client secret:',
      { type: 'text' },
      previousOptions?.apiVersion === '1.0'
        ? previousOptions?.clientSecret
        : undefined,
    );
    const accessTokenUrl = await prompt<string>(
      'Enter your access token URL:',
      { type: 'text' },
      previousOptions?.apiVersion === '1.0'
        ? previousOptions?.accessTokenUrl
        : undefined,
    );
    entries.push(['EDGE_CLIENT_SECRET', clientSecret]);
    entries.push(['EDGE_ACCESS_TOKEN_URL', accessTokenUrl]);
  }

  const submitForReview = await prompt<boolean>(
    'When uploading, automatically submit new update for review?',
    { type: 'confirm' },
    !previousOptions?.skipSubmitReview,
  );
  entries.push(['EDGE_SKIP_SUBMIT_REVIEW', !submitForReview]);

  return entries;
}

async function updateEnvFile(entries: Entry[]) {
  consola.start(`Writing to \`${envFile}\`...`);
  let template = await readFile(envFile, 'utf-8').catch(() => '');

  for (const [name, value] of entries) {
    const formattedValue = typeof value === 'string' ? `"${value}"` : value;
    const replacement = `${name}=${formattedValue}`;
    const pattern = new RegExp(`^${name}=.*$`, 'm');
    const existing = template.match(pattern);
    if (existing) {
      template = template.replace(existing[0], replacement);
    } else {
      template += `\n${replacement}`;
    }
  }

  const backupFilename = `${envFile}.backup-${Date.now()}`;
  await copyFile(envFile, backupFilename)
    .then(() => {
      consola.info(`Backed up old \`${envFile}\` to \`${backupFilename}\``);
    })
    .catch(() => {
      // If the file doesn't exist, continue
    });

  await writeFile(envFile, template, 'utf-8');

  console.log();
  consola.success('Wrote config to `.env.submit`');
}
