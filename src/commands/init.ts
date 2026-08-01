import {
  type EdgeAddonStoreV1_1Options,
  type ChromeWebStoreV1_1Options,
  type ChromeWebStoreV2Options,
  type FirefoxAddonStoreV5Options,
  type OperaAddonsStoreOptions,
  type SafariAddonStoreOptions,
  resolveConfig,
  type AllChromeOptions,
  type InlineConfig,
} from '../config';
import { copyFile, writeFile, readFile } from 'node:fs/promises';
import type { CustomEnv } from '../utils/env-utils';
import { highlight, logger } from '../utils/logger';
import { confirm, select, multiselect, question } from '@topcli/prompts';
import { FetchError } from '../utils/errors';

type Entry = [key: keyof CustomEnv, value: string | number | boolean];

const ENV_FILE = '.env.submit';

const ARROW = `\x1b[2m→\x1b[0m`;

export async function init(config: InlineConfig) {
  logger.log();
  logger.info(`Initialize or update an existing ${highlight(ENV_FILE)} file.`);
  logger.log();

  const previousConfig = resolveConfig(config);

  const stores = await multiselect('What stores do you want to configure?', {
    choices: [
      { value: 'chrome', label: 'Chrome Web Store' },
      { value: 'firefox', label: 'Firefox Addon Store' },
      { value: 'edge', label: 'Edge Addon Store' },
      { value: 'opera', label: 'Opera Addons' },
      { value: 'safari', label: 'Safari (App Store Connect)' },
    ],
    showHint: true,
  });
  if (!stores?.length) {
    logger.log();
    logger.fatal('No stores selected, exiting without making any changes.');
  }

  const replacements: Entry[] = [];
  if (stores?.includes('chrome')) {
    replacements.push(
      ...(await initChrome(previousConfig.chrome as AllChromeOptions)),
    );
  }
  if (stores?.includes('firefox')) {
    replacements.push(
      ...(await initFirefox(
        previousConfig.firefox as
          Partial<FirefoxAddonStoreV5Options> | undefined,
      )),
    );
  }
  if (stores?.includes('edge')) {
    replacements.push(...(await initEdge(previousConfig.edge)));
  }
  if (stores?.includes('opera')) {
    replacements.push(...(await initOpera(previousConfig.opera)));
  }

  if (stores?.includes('safari')) {
    replacements.push(
      ...(await initSafari(
        previousConfig.safari as Partial<SafariAddonStoreOptions> | undefined,
      )),
    );
  }

  await updateEnvFile(replacements);

  logger.log();
  logger.log(
    `To submit an update, run:\n\n  ${highlight('publish-extension --chrome-zip path/to/extension.zip')}\n    ${highlight('--firefox-zip path/to/extension.zip')}\n    ${highlight('--edge-zip path/to/extension.zip')}\n    ${highlight('--opera-zip path/to/extension.zip')}\n    ${highlight('--safari-bundle-path path/to/extension.pkg')}`,
  );
  logger.log();
}

async function initChrome(
  previousOptions: Partial<AllChromeOptions> | undefined,
): Promise<Entry[]> {
  const entries: Entry[] = [];

  console.log();
  logger.info('\x1b[1mChrome Web Store Setup\x1b[0m');

  const apiVersionEnvVar = 'CHROME_API_VERSION';
  console.log();
  logger.info(highlight(apiVersionEnvVar));
  const apiVersion = await select('Select an option', {
    choices: [
      {
        label: 'v2 (recommended)',
        value: 'v2',
      },
      {
        label: 'v1.1 (deprecated)',
        value: 'v1.1',
        description: 'will stop working October 15th, 2026',
      },
    ],
  });
  entries.push([apiVersionEnvVar, apiVersion]);

  const extensionIdEnvVar = 'CHROME_EXTENSION_ID';
  logger.log();
  logger.info(highlight(extensionIdEnvVar));
  logger.log(`Your extension's ID can be found in multiple places:`);
  logger.log(
    '  - Under the extension name when editing it on the developer dashboard',
  );
  logger.log(
    `    ${ARROW} https://chrome.google.com/webstore/developer/dashboard`,
  );
  logger.log("  - In the URL of it's CWS listing");
  logger.log(
    `    ${ARROW} https://chrome.google.com/webstore/detail/${highlight('<extension-id>')}/<slug>`,
  );
  const extensionId = await question('Enter the extension ID', {
    defaultValue: previousOptions?.extensionId,
  });
  entries.push([extensionIdEnvVar, extensionId]);

  if (apiVersion === 'v2') {
    entries.push(
      ...(await initChromeV2(
        previousOptions as Partial<ChromeWebStoreV2Options>,
      )),
    );
  } else {
    entries.push(
      ...(await initChromeV1_1(
        previousOptions as Partial<ChromeWebStoreV1_1Options>,
      )),
    );
  }

  return entries;
}

async function initChromeV1_1(
  previousOptions: Partial<ChromeWebStoreV1_1Options> | undefined,
): Promise<Entry[]> {
  const entries: Entry[] = [];

  const clientIdEnvVar = 'CHROME_CLIENT_ID';
  const clientSecretEnvVar = 'CHROME_CLIENT_SECRET';
  logger.log();
  logger.info(
    `${highlight(clientIdEnvVar)} and ${highlight(clientSecretEnvVar)}`,
  );
  logger.log(`Follow "Initial Setup" from:`);
  logger.log(
    `  ${ARROW} https://web.archive.org/web/20250211105307/https://developer.chrome.com/docs/webstore/using-api`,
  );
  const clientId = await question('Enter your client ID', {
    defaultValue: previousOptions?.clientId,
  });
  entries.push([clientIdEnvVar, clientId]);
  const clientSecret = await question('Enter your client secret', {
    defaultValue: previousOptions?.clientSecret,
  });
  entries.push([clientSecretEnvVar, clientSecret]);

  logger.log();
  const generateRefreshToken =
    !previousOptions?.refreshToken ||
    (await confirm('Generate a new refresh token?'));

  if (generateRefreshToken) {
    const refreshTokenEnvVar = 'CHROME_REFRESH_TOKEN';
    logger.log('Open the below URL and login to get an auth code');
    logger.log(
      `  ${ARROW} https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=${clientId}&redirect_uri=urn:ietf:wg:oauth:2.0:oob`,
    );
    const authCode = await question('Enter the auth code');

    const data = new URLSearchParams();
    data.set('client_id', clientId);
    data.set('client_secret', clientSecret);
    data.set('code', authCode);
    data.set('grant_type', 'authorization_code');
    data.set('redirect_uri', 'urn:ietf:wg:oauth:2.0:oob');
    const tokenUrl = `https://accounts.google.com/o/oauth2/token`;
    const res = await fetch(tokenUrl, { method: 'POST', body: data });

    if (!res.ok) throw await FetchError.from(res);

    const json = (await res.json()) as { refresh_token: string };
    logger.info(`${highlight(refreshTokenEnvVar)}: ${json.refresh_token}`);
    entries.push(['CHROME_REFRESH_TOKEN', json.refresh_token]);
  }

  const publishTargetEnvVar = 'CHROME_PUBLISH_TARGET';
  logger.log();
  logger.info(highlight(publishTargetEnvVar));
  const publishTarget = await select(`Select an option`, {
    choices: [
      {
        label: 'default',
        value: 'default',
        description: 'Public release channel',
      },
      {
        label: 'trustedTesters',
        value: 'trustedTesters',
        description: 'Prerelease, internal channel',
      },
    ],
  });
  entries.push([publishTargetEnvVar, publishTarget]);

  const skipSubmitReviewEnvVar = 'CHROME_SKIP_SUBMIT_REVIEW';
  logger.log();
  logger.info(highlight(skipSubmitReviewEnvVar));
  const submitForReview = await confirm(
    'After uploading, submit new version for review?',
    { initial: !previousOptions?.skipSubmitReview },
  );
  entries.push([skipSubmitReviewEnvVar, !submitForReview]);

  return entries;
}

async function initChromeV2(
  previousOptions: Partial<ChromeWebStoreV2Options> | undefined,
): Promise<Entry[]> {
  const entries: Entry[] = [];

  const publisherIdEnvVar = 'CHROME_PUBLISHER_ID';
  console.log();
  logger.info(highlight(publisherIdEnvVar));
  logger.log(
    `Found in the URL of the developer dashboard after selecting the correct publisher`,
  );
  logger.log(
    `  ${ARROW} https://chrome.google.com/webstore/devconsole/${highlight('<publisher-id>')}`,
  );
  const publisherId = await question('Enter your publisher ID', {
    defaultValue: previousOptions?.publisherId,
  });
  entries.push([publisherIdEnvVar, publisherId]);

  const serviceAccountClientEmailEnvVar = 'CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL';
  const serviceAccountPrivateKeyEnvVar = 'CHROME_SERVICE_ACCOUNT_PRIVATE_KEY';
  console.log();
  logger.info(
    `${highlight(serviceAccountClientEmailEnvVar)} and ${highlight(serviceAccountPrivateKeyEnvVar)}`,
  );
  logger.log('The CWS API uses service accounts for authentication.');
  logger.log("  1. Create a service account following Google's official guide");
  logger.log(
    `     ${ARROW} https://developer.chrome.com/docs/webstore/service-accounts`,
  );
  logger.log(
    '  2. When you get to "Obtain access tokens", follow "Use a JSON Web Token" and stop after downloading the JSON file',
  );
  logger.log(
    '     \x1b[2m> WARNING: Google does not recommend service worker keys for day-to-day work, but they are still the correct form of authentication for CI\x1b[0m',
  );
  logger.log(
    `  3. Open the JSON file and use the ${highlight('client_email')} and ${highlight('private_key')} fields below`,
  );
  const serviceAccountClientEmail = await question(
    `Enter the ${highlight('client_email')}`,
    {
      defaultValue: previousOptions?.serviceAccountClientEmail,
    },
  );
  entries.push([serviceAccountClientEmailEnvVar, serviceAccountClientEmail]);

  const serviceAccountPrivateKey = await question(
    `Enter the ${highlight('private_key')} (copy the JSON value, minus the surrounding quotes, keeping the "\\n" characters as-is)`,
    { defaultValue: previousOptions?.serviceAccountPrivateKey },
  );
  entries.push([serviceAccountPrivateKeyEnvVar, serviceAccountPrivateKey]);

  const skipSubmitReviewEnvVar = 'CHROME_SKIP_SUBMIT_REVIEW';
  logger.log();
  logger.info(highlight(skipSubmitReviewEnvVar));
  const submitForReview = await confirm(
    'After uploading, submit new version for review?',
    { initial: !previousOptions?.skipSubmitReview },
  );
  entries.push([skipSubmitReviewEnvVar, !submitForReview]);

  if (submitForReview) {
    const cancelPendingEnvVar = 'CHROME_CANCEL_PENDING';
    logger.log();
    logger.info(highlight(cancelPendingEnvVar));
    logger.log('  Yes - if another review is in-progress, cancel it');
    logger.log('  No  - if another review is in-progress, throw an error');
    const cancelPending = await confirm('', {
      initial: previousOptions?.cancelPending ?? false,
    });
    entries.push([cancelPendingEnvVar, cancelPending]);

    const skipReviewEnvVar = 'CHROME_SKIP_REVIEW';
    logger.log();
    logger.info(highlight(skipReviewEnvVar));
    logger.log(
      '  Yes - Only available for eligible changes (https://developer.chrome.com/docs/webstore/skip-review)',
    );
    logger.log("  No  - Most extensions can't skip the review process");

    const skipReview = await confirm('', {
      initial: previousOptions?.skipReview ?? false,
    });
    entries.push([skipReviewEnvVar, skipReview]);

    const publishTypeEnvVar = 'CHROME_PUBLISH_TYPE';
    logger.log();
    logger.info(highlight(publishTypeEnvVar));
    const publishType = await select(`Select an option`, {
      choices: [
        {
          label: 'DEFAULT_PUBLISH',
          value: 'DEFAULT_PUBLISH',
          description: 'Publish immediately after review approval',
        },
        {
          label: 'STAGED_PUBLISH',
          value: 'STAGED_PUBLISH',
          description:
            'Leave the update as staged after review approval, allowing it to be published later manually',
        },
      ],
    });
    entries.push([publishTypeEnvVar, publishType]);

    const deployPercentageEnvVar = 'CHROME_DEPLOY_PERCENTAGE';
    logger.log();
    logger.info(highlight(deployPercentageEnvVar));
    const deployPercentage = await question<number>(
      'Enter a percentage, from 0 to 100',
      {
        defaultValue:
          previousOptions?.deployPercentage != null
            ? String(previousOptions.deployPercentage)
            : '100',
        transformer: {
          transform: input => {
            const n = Number(input);
            if (isNaN(n)) return { isValid: false, error: 'Enter a number' };
            if (n < 0 || n > 100)
              return {
                isValid: false,
                error: 'Enter a number between 0 and 100',
              };
            return { isValid: true as const, transformed: n };
          },
        },
      },
    );
    entries.push([deployPercentageEnvVar, deployPercentage]);
  }

  return entries;
}

async function initFirefox(
  previousOptions: Partial<FirefoxAddonStoreV5Options> | undefined,
): Promise<Entry[]> {
  const entries: Entry[] = [];

  console.log();
  logger.info('\x1b[1mFirefox Addon Store Setup\x1b[0m');

  const extensionIdEnvVar = 'FIREFOX_EXTENSION_ID';
  console.log();
  logger.info(highlight(extensionIdEnvVar));
  logger.log(
    'When editing the product page on the developer dashboard, the ID is in the URL',
  );
  logger.log(
    `   ${ARROW} https://addons.mozilla.org/en-US/developers/addon/${highlight('<extension-id>')}/edit`,
  );
  const extensionId = await question('Enter extension ID', {
    defaultValue: previousOptions?.extensionId,
  });
  entries.push([extensionIdEnvVar, extensionId]);

  const jwtIssuerEnvVar = 'FIREFOX_JWT_ISSUER';
  const jwtSecretEnvVar = 'FIREFOX_JWT_SECRET';
  console.log();
  logger.info(
    `${highlight(jwtIssuerEnvVar)} and ${highlight(jwtSecretEnvVar)}`,
  );
  logger.log(`Values can be created at`);
  console.log(
    `  ${ARROW} https://addons.mozilla.org/developers/addon/api/key/`,
  );
  const jwtIssuer = await question('Enter the JWT issuer', {
    defaultValue: previousOptions?.jwtIssuer,
  });
  entries.push([jwtIssuerEnvVar, jwtIssuer]);

  const jwtSecret = await question('Enter the JWT secret', {
    defaultValue: previousOptions?.jwtSecret,
  });
  entries.push([jwtSecretEnvVar, jwtSecret]);

  const channelEnvVar = 'FIREFOX_CHANNEL';
  console.log();
  logger.info(highlight(channelEnvVar));
  const channel = await select('Select an option', {
    choices: [
      {
        label: 'listed',
        value: 'listed',
        description: 'Hosted on addons.mozilla.com',
      },
      {
        label: 'unlisted',
        value: 'unlisted',
        description: 'For self-hosting',
      },
    ],
  });
  entries.push(['FIREFOX_CHANNEL', channel]);

  const skipSubmitReviewEnvVar = 'FIREFOX_SKIP_SUBMIT_REVIEW';
  logger.log();
  logger.info(highlight(skipSubmitReviewEnvVar));
  const submitForReview = await confirm(
    'After uploading, submit new version for review?',
    { initial: !previousOptions?.skipSubmitReview },
  );
  entries.push([skipSubmitReviewEnvVar, !submitForReview]);

  return entries;
}

async function initOpera(
  previousOptions: Partial<OperaAddonsStoreOptions> | undefined,
): Promise<Entry[]> {
  const entries: Entry[] = [];

  console.log();
  logger.info('\x1b[1mOpera Addons Setup\x1b[0m');

  const packageIdEnvVar = 'OPERA_PACKAGE_ID';
  console.log();
  logger.info(highlight(packageIdEnvVar));
  logger.log("Found in the developer dashboard's URL");
  logger.log(
    `  ${ARROW} https://addons.opera.com/developer/package/${highlight('<package-id>')}`,
  );
  const packageId = await question<number>('Enter the package ID', {
    defaultValue: previousOptions?.packageId
      ? String(previousOptions.packageId)
      : undefined,
    transformer: {
      transform: input => {
        const n = parseInt(input);
        if (isNaN(n)) return { isValid: false, error: 'Enter an integer' };
        if (n < 0)
          return {
            isValid: false,
            error: 'Package ID must be a positive integer',
          };
        return { isValid: true, transformed: n };
      },
    },
  });
  entries.push([packageIdEnvVar, packageId]);

  const sessionIdEnvVar = 'OPERA_SESSION_ID';
  logger.log();
  logger.info(highlight(sessionIdEnvVar));
  logger.log(
    `The value of the ${highlight('sessionid')} cookie available on the developer dashboard`,
  );
  logger.log(`  ${ARROW} https://addons.opera.com/developer/`);
  const sessionId = await question('Enter the session ID', {
    defaultValue: previousOptions?.sessionId,
  });
  entries.push([sessionIdEnvVar, sessionId]);

  const skipSubmitReviewEnvVar = 'OPERA_SKIP_SUBMIT_REVIEW';
  logger.log();
  logger.info(highlight(skipSubmitReviewEnvVar));
  const submitForReview = await confirm(
    'After uploading, submit new version for review?',
    { initial: !previousOptions?.skipSubmitReview },
  );
  entries.push([skipSubmitReviewEnvVar, !submitForReview]);

  return entries;
}

async function initEdge(
  previousOptions: Partial<EdgeAddonStoreV1_1Options> | undefined,
): Promise<Entry[]> {
  const entries: Entry[] = [];

  console.log();
  logger.info('\x1b[1mEdge Addon Store Setup\x1b[0m');

  const productIdEnvVar = 'EDGE_PRODUCT_ID';
  logger.log();
  logger.info(highlight(productIdEnvVar));
  logger.info(
    'The product ID is listed on the developer dashboard at the top of the page, under the extension name',
  );
  logger.log(
    `  ${ARROW} https://partner.microsoft.com/dashboard/microsoftedge/overview`,
  );
  const productId = await question('Enter product ID:', {
    defaultValue: previousOptions?.productId,
  });
  entries.push([productIdEnvVar, productId]);

  const clientIdEnvVar = 'EDGE_CLIENT_ID';
  const apiKeyEnvVar = 'EDGE_API_KEY';
  logger.log();
  logger.info(`${highlight(clientIdEnvVar)} and ${highlight(apiKeyEnvVar)}`);
  logger.log("Follow Microsoft's guide to get your client ID and API key");
  logger.log(
    `  ${ARROW} https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api#before-you-begin`,
  );
  const clientId = await question('Enter the client ID', {
    defaultValue: previousOptions?.clientId,
  });
  entries.push([clientIdEnvVar, clientId]);

  const apiKey = await question('Enter the API key', {
    defaultValue: previousOptions?.apiKey,
  });
  entries.push([apiKeyEnvVar, apiKey]);

  const skipSubmitReviewEnvVar = 'EDGE_SKIP_SUBMIT_REVIEW';
  logger.log();
  logger.info(highlight(skipSubmitReviewEnvVar));
  const submitForReview = await confirm(
    'After uploading, submit new version for review?',
    { initial: !previousOptions?.skipSubmitReview },
  );
  entries.push([skipSubmitReviewEnvVar, !submitForReview]);

  return entries;
}

async function initSafari(
  previousOptions: Partial<SafariAddonStoreOptions> | undefined,
): Promise<Entry[]> {
  const entries: Entry[] = [];

  console.log();
  logger.info('\x1b[1mSafari (App Store Connect) Setup\x1b[0m');

  const bundleTypeEnvVar = 'SAFARI_BUNDLE_TYPE';
  console.log();
  logger.info(highlight(bundleTypeEnvVar));
  const bundleType = await select('Select the bundle type', {
    choices: [
      {
        label: 'macos',
        value: 'macos',
        description: 'A .pkg installer for the Mac App Store',
      },
      {
        label: 'ios',
        value: 'ios',
        description: 'An .ipa for the iOS App Store',
      },
      {
        label: 'osx',
        value: 'osx',
        description: 'Alias for macOS (legacy name)',
      },
    ],
  });
  entries.push([bundleTypeEnvVar, bundleType]);

  const apiKeyIdEnvVar = 'SAFARI_API_KEY_ID';
  logger.log();
  logger.info(highlight(apiKeyIdEnvVar));
  logger.log('Your App Store Connect API Key ID. Create one at:');
  logger.log(
    `  ${ARROW} https://appstoreconnect.apple.com/access/integrations/api`,
  );
  const apiKeyId = await question('Enter the API Key ID', {
    defaultValue: previousOptions?.apiKeyId,
  });
  entries.push([apiKeyIdEnvVar, apiKeyId]);

  const apiIssuerIdEnvVar = 'SAFARI_API_ISSUER_ID';
  logger.log();
  logger.info(highlight(apiIssuerIdEnvVar));
  logger.log(
    'The Issuer ID shown at the top of the App Store Connect API Keys page.',
  );
  const apiIssuerId = await question('Enter the API Issuer ID', {
    defaultValue: previousOptions?.apiIssuerId,
  });
  entries.push([apiIssuerIdEnvVar, apiIssuerId]);

  const apiPrivateKeyPathEnvVar = 'SAFARI_API_PRIVATE_KEY_PATH';
  logger.log();
  logger.info(highlight(apiPrivateKeyPathEnvVar));
  logger.log(
    'Path to the .p8 private key file downloaded from App Store Connect.',
  );
  logger.log(
    `  ${ARROW} The file is named AuthKey_${highlight('<KEY_ID>')}.p8`,
  );
  const apiPrivateKeyPath = await question('Enter path to .p8 key file', {
    defaultValue: previousOptions?.apiPrivateKeyPath,
  });
  entries.push([apiPrivateKeyPathEnvVar, apiPrivateKeyPath]);

  return entries;
}

async function updateEnvFile(entries: Entry[]) {
  let template = await readFile(ENV_FILE, 'utf-8').catch(() => '');

  for (const [name, value] of entries) {
    const replacement = `${name}=${JSON.stringify(value)}`;
    const pattern = new RegExp(`^${name}=.*$`, 'm');
    const existing = template.match(pattern);
    if (existing) {
      template = template.replace(existing[0], replacement);
    } else {
      template += `\n${replacement}`;
    }
  }

  const backupFilename = `${ENV_FILE}.backup-${Date.now()}`;
  await copyFile(ENV_FILE, backupFilename)
    .then(() => {
      logger.log();
      logger.info(
        `Backed up old ${highlight(ENV_FILE)} to ${highlight(backupFilename)}`,
      );
    })
    .catch(() => {
      // If the file doesn't exist, continue
    });

  await writeFile(ENV_FILE, template, 'utf-8');
  logger.success(`${highlight(ENV_FILE)} updated!`);
}
