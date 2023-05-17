<h1 align="center">Publish Browser Extension</h1>
<p align="center">Publish an extension to all the extension stores in a single command!</p>

![Demo](.github/assets/demo.png)

#### Features

- Publish to the **Chrome Web Store**
- Helper script to generate a GCP refresh token
- Publish to the **Firefox Addon Store**
- **Upload sources** to the Firefox Addon Store
- Publish to the **Microsoft Edge Addon Store**

###### Install

```bash
npm i -D publish-browser-extension
```

###### CLI Usage

```bash
publish-extension \
    --dry-run \
    --chrome-zip "dist/chrome.zip" \
    --chrome-extension-id "<cws-extension-id>" \
    --chrome-client-id "<gcp-client-id>" \
    --chrome-client-secret "<gcp-client-secret>" \
    --chrome-refresh-token "<gcp-refresh-token>" \
    --chrome-publish-target "<default|trustedTesters>" \
    --chrome-skip-submit-review \
    --firefox-zip "dist/firefox.zip" \
    --firefox-sources-zip "dist/sources.zip" \
    --firefox-extension-id "<addons-extension-id>" \
    --firefox-jwt-issuer "<addons-jwt-issuer>" \
    --firefox-jwt-secret "<addons-jwt-secret>" \
    --firefox-channel "<listed|unlisted>" \
    --edge-zip "dist/chrome.zip" \
    --edge-product-id "<edge-product-id>" \
    --edge-client-id "<edge-client-id>" \
    --edge-client-secret "<edge-client-secret>" \
    --edge-access-token-url "<edge-access-token-url>" \
    --edge-skip-submit-review
```

> See `publish-extension --help` for details on generating and retrieving each of these values

###### JS Usage

<!-- prettier-ignore -->
```js
import { publishExtension } from 'publish-browser-extension';

publishExtension({
  dryRun: true,
  chrome: {
    zip: 'dist/chrome.zip',
    extensionId: '<cws-extension-id>',
    clientId: '<gcp-client-id>',
    clientSecret: '<gcp-client-secret>',
    refreshToken: '<gcp-refresh-token>',
    publishTarget: '<default|trustedTesters>',
    skipSubmitReview: false,
  },
  firefox: {
    zip: 'dist/firefox.zip',
    sourcesZip: 'dist/sources.zip',
    extensionId: '<addons-extension-id>',
    jwtIssuer: '<addons-jwt-issuer>',
    jwtSecret: '<addons-jwt-secret>',
    channel: '<listed|unlisted>',
  },
  edge: {
    zip: 'dist/chrome.zip',
    productId: "<edge-product-id>",
    clientId: "<edge-client-id>",
    clientSecret: "<edge-client-secret>",
    accessTokenUrl: "<edge-access-token-url>",
    skipSubmitReview: false,
  },
})
  .then(results => console.log(results))
  .catch(err => console.error(err));
```

### Chrome Web Store Refresh Token Generator

This package also ships with a CLI tool called `chrome-refresh-token`, and it can be used to generate a refresh token. Run run it and follow the prompts; provide your client ID, client secret.

```sh
pnpm i publish-browser-extension
pnpm chrome-refresh-token
```

## Documentation

For docs, run `publish-extension --help`. It includes everything you'll need: examples, flags, environment variables, steps to retrieve secrets, etc.

## Contributing

<a href="https://github.com/aklinker1/publish-browser-extension/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=aklinker1/publish-browser-extension" />
</a>

### Setup

1. Install [node](https://nodejs.org)
2. Install [`pnpm`](https://pnpm.io/)
   ```bash
   npm i -g pnpm
   ```
3. Install dependencies
   ```bash
   pnpm i
   ```
4. Copy `.env.template` &rarr; `.env` and fill it out
   ```bash
   cp .env.template .env
   ```

### Scripts

Checkout the scripts in the `package.json`, they're all self-explanatory, but here are some examples:

```bash
pnpm format  # Run prettier to format source code
pnpm test    # Run unit tests
```

### Manual Testing

The `dev` scripts are going to be the main way of manually testing the tool.

```sh
# Firefox and Chrome
pnpm dev:all

# Just Chrome
pnpm dev:chrome

# Just Firefox
pnpm dev:firefox
```

### First Time Setup

Before running any of the dev commands, you have to upload a test extension to the stores. This is the extension the dev commands will publish updates for.

1. Run `pnpm build`. This will build the library, but also create a test extension for you to upload
1. In the Chrome Web Store, create a new extension using `extension/chrome.zip`, but don't submit it for review
1. In the Firefox Addon Store, create a new extension using `extension/firefox.zip`, and set it as unlisted

Next, you'll need to setup a `.env` file that contains all the secrets

```env
# Your extension's ID is listed under the extension name at the top of the store listing page
CHROME_EXTENSION_ID=<chrome.runtime.id>
# Follow Google's docs to get these secrets:
# https://developer.chrome.com/docs/webstore/using_webstore_api/
CHROME_CLIENT_ID=...
CHROME_CLIENT_SECRET=...
CHROME_REFRESH_TOKEN=...

# Your extension's UUID listed under the "technical details" section of the addon developer hub's page
FIREFOX_EXTENSION_ID=...
# Follow Mozilla docs for getting your credentials for the addon-server API
# https://addons-server.readthedocs.io/en/latest/topics/api/auth.html#access-credentials
FIREFOX_JWT_ISSUER=...
FIREFOX_JWT_SECRET=...

# Make sure you don't submit either extension for review or publish to production
CHROME_SKIP_SUBMIT_REVIEW=true
CHROME_PUBLISH_TARGET=trustedTesters
FIREFOX_CHANNEL=unlisted
```

Then you can run the `dev` scripts to test out the publish CLI tool.

```bash
pnpm dev:all
```
