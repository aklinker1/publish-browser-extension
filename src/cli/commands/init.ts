import { defineCommand } from '../defineCommand';
import { camelToSnake, Flags } from '../flags';
import consola from 'consola';
import { createPrompts } from '../prompts';
import { ChildProcess } from 'child_process';
import fetch from 'node-fetch';
import fs from 'node:fs/promises';

export default defineCommand(async flags => {
  const original: Flags = { ...flags };
  delete original['--'];

  const { default: open } = await import('open');

  const { stores } = await createPrompts([
    {
      name: 'stores',
      type: 'multiselect',
      message: 'Select the stores you want to setup',
      choices: [
        { title: 'Chrome Web Store', value: 'chrome' },
        { title: 'Firefox Addon Store', value: 'firefox' },
        { title: 'Edge Addons', value: 'edge' },
      ],
    },
  ]);

  const newConfig = { ...original };

  if (stores.includes('chrome')) {
    console.log();
    console.log('\x1b[1mConfiguring Chrome Web Store\x1b[0m');
    console.log(
      `\x1b[2mDeveloper Dashboard: https://chrome.google.com/webstore/devconsole\x1b[0m`,
    );
    let browser: ChildProcess;
    const chromeResults = await createPrompts([
      {
        name: 'chromeExtensionId',
        type: 'text',
        tip: `Your extension ID can be found underneath the extension's title on the "store listing" dev dashboard page`,
        message: 'Enter your extension ID',
        initial: original.chromeExtensionId,
      },
      {
        name: 'chromeClientId',
        type: 'text',
        tip: `Follow Google's docs for creating a client ID and secret on GCP. You can stop before the "Testing your OAuth application" section.\nhttps://developer.chrome.com/docs/webstore/using_webstore_api/#setup`,
        message: 'Enter your GCP client ID',
        initial: original.chromeClientId,
      },
      {
        name: 'chromeClientSecret',
        type: 'text',
        message: 'Enter your GCP client secret',
        initial: original.chromeClientSecret,
      },
      {
        type: 'confirm',
        name: 'generateNewToken',
        message: 'Regenerate chrome refresh token',
      },
      {
        isSkipped: res => !res.generateNewToken,
        async onBefore(results) {
          const authCodeUrl = `https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=${results.chromeClientId}&redirect_uri=urn:ietf:wg:oauth:2.0:oob`;
          browser = await open(authCodeUrl);
        },
        async onAfter(results) {
          browser.kill();

          consola.info('Getting refresh token...');
          const tokenUrl = `https://accounts.google.com/o/oauth2/token`;
          const body = new URLSearchParams();
          body.set('client_id', results.chromeClientId);
          body.set('client_secret', results.chromeClientSecret);
          body.set('code', results.chromeAuthCode);
          body.set('grant_type', 'authorization_code');
          body.set('redirect_uri', 'urn:ietf:wg:oauth:2.0:oob');
          const res = await fetch(tokenUrl, { method: 'POST', body });
          const { refresh_token: refreshToken } = await res.json();
          consola.success('Regenerated refresh token: ' + refreshToken);
          results.chromeRefreshToken = refreshToken;
        },
        name: 'chromeAuthCode',
        type: 'text',
        message: 'Enter the auth code from your browser:',
      },
      {
        name: 'chromeSkipSubmitReview',
        type: 'select',
        message: 'Submit for review',
        choices: [
          {
            title: 'After uploading, submit new ZIP for review',
            value: 'false',
          },
          {
            title: "After uploading, but don't submit automatically",
            value: 'true',
          },
        ],
      },
      {
        name: 'chromePublishTarget',
        type: 'select',
        message: 'Select a publish target',
        choices: [
          { title: 'Public', value: 'default' },
          { title: 'Trusted Testers', value: 'trustedTesters' },
        ],
      },
    ]);
    Object.assign(newConfig, chromeResults);
  }

  if (stores.includes('firefox')) {
    console.log();
    console.log('\x1b[1mConfiguring Firefox Addon Store\x1b[0m');
    console.log(
      `\x1b[2mDeveloper Dashboard: https://addons.mozilla.org/developers/\x1b[0m`,
    );
    const firefoxResults = await createPrompts([
      {
        name: 'firefoxExtensionId',
        type: 'text',
        tip: `Listed as the extension's UUID under the "Technical Details" section on the dev dashboard's product page. Include the curly braces around the UUID if present.`,
        message: 'Enter your extension ID',
        initial: original.firefoxExtensionId,
      },
      {
        name: 'firefoxJwtIssuer',
        type: 'text',
        tip: `Your JWT credentials can be obtained here after logging in: https://addons.mozilla.org/developers/addon/api/key/`,
        message: 'JWT Issuer',
        initial: original.firefoxJwtIssuer,
      },
      {
        name: 'firefoxJwtSecret',
        type: 'text',
        message: 'JWT Secret',
        initial: original.firefoxJwtSecret,
      },
      {
        name: 'firefoxChannel',
        type: 'select',
        message: 'Publish Channel',
        choices: [
          { title: 'Listed', value: 'listed' },
          { title: 'Unlisted', value: 'unlisted' },
        ],
      },
    ]);
    Object.assign(newConfig, firefoxResults);
  }

  if (stores.includes('edge')) {
    console.log();
    console.log('\x1b[1mConfiguring Edge Addons\x1b[0m');
    console.log(
      `\x1b[2mDeveloper Dashboard: https://aka.ms/PartnerCenterLogin\x1b[0m`,
    );
    const edgeResults = await createPrompts([
      {
        name: 'edgeProductId',
        type: 'text',
        tip: `On the developer dashboard, the extension's product ID is listed at the top of the page under the extension name`,
        message: 'Product ID',
        initial: original.edgeProductId,
      },
      {
        name: 'edgeClientId',
        type: 'text',
        tip: `Your client ID and access token URL are listed at the top of the page here: https://partner.microsoft.com/en-us/dashboard/microsoftedge/publishapi`,
        message: 'Client ID',
        initial: original.edgeClientId,
      },
      {
        name: 'edgeAccessTokenUrl',
        type: 'text',
        message: 'Access Token URL',
        initial: original.edgeAccessTokenUrl,
      },
      {
        name: 'edgeClientSecret',
        type: 'text',
        tip: `Client secrets are listed under the "Secrets" section. Create one if there are none listed.`,
        message: 'Client Secret',
        initial: original.edgeClientSecret,
      },
      {
        name: 'edgeSkipSubmitReview',
        type: 'select',
        message: 'Submit for review',
        choices: [
          {
            title: 'After uploading, submit new ZIP for review',
            value: 'false',
          },
          {
            title: "After uploading, but don't submit automatically",
            value: 'true',
          },
        ],
      },
    ]);
    Object.assign(newConfig, edgeResults);
  }

  const template = `# Chrome
CHROME_EXTENSION_ID="{{chromeExtensionId}}"
CHROME_CLIENT_ID="{{chromeClientId}}"
CHROME_CLIENT_SECRET="{{chromeClientSecret}}"
CHROME_REFRESH_TOKEN="{{chromeRefreshToken}}"
CHROME_PUBLISH_TARGET="{{chromePublishTarget}}"
CHROME_SKIP_SUBMIT_REVIEW="{{chromeSkipSubmitReview}}"

# Edge
EDGE_PRODUCT_ID="{{edgeProductId}}"
EDGE_CLIENT_ID="{{edgeClientId}}"
EDGE_CLIENT_SECRET="{{edgeClientSecret}}"
EDGE_ACCESS_TOKEN_URL="{{edgeAccessTokenUrl}}"
EDGE_SKIP_SUBMIT_REVIEW="{{edgeSkipSubmitReview}}"

# Firefox
FIREFOX_EXTENSION_ID="{{firefoxExtensionId}}"
FIREFOX_JWT_ISSUER="{{firefoxJwtIssuer}}"
FIREFOX_JWT_SECRET="{{firefoxJwtSecret}}"
FIREFOX_CHANNEL="{{firefoxChannel}}"
`;

  const value = Object.entries(newConfig).reduce(
    (template, [key, value]) =>
      template.replaceAll(`{{${key}}}`, (value as string) || ''),
    template,
  );

  await fs.writeFile(newConfig.envFile ?? '.env.submit', value);

  console.log();
  consola.success('Done!');
  console.log();
  consola.log('Run `publish-extension --dry-run` to test out your credentials');
});
