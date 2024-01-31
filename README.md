<h1 align="center">Publish Browser Extension</h1>
<p align="center">Publish an extension to all the extension stores in a single command!</p>

https://github.com/aklinker1/publish-browser-extension/assets/10101283/b0e856ca-4e26-4c7e-9ff8-c900e203cab5

## Features

- Publish to the **Chrome Web Store**, **Firefox Addon Store**, and **Edge Addon Store**
- Helper script to generate secrets and configure options
- **Upload sources ZIP** to the Firefox Addon Store

> [!IMPORTANT]
>
> You are responsible for uploading and submitting an extension for the first time by hand. `publish-browser-extension` does not provide tools for creating a new extension.

## Install

```sh
npm i -D publish-browser-extension
pnpm i -D publish-browser-extension
yarn add -D publish-browser-extension
```

## CLI Usage

To get started, run the init command. It will walk you through generating all the necessary environment variables/CLI flags, saving them to a `.env.submit` file:

```sh
publish-extension init
```

> All CLI flags can be passed as environment variables instead. For example, setting the `CHROME_CLIENT_ID` environment variable is equivalent to passing `--chrome-client-id`. Just convert the flag to UPPER_SNAKE_CASE.

Then, just run the submit command, passing the ZIP files you want to submit:

```sh
publish-extension \
  --chrome-zip dist/chrome.zip \
  --firefox-zip dist/firefox.zip --firefox-sources-zip dist/sources.zip \
  --edge-zip dist/chrome.zip
```

`publish-extesion` will automatically look for a `.env.submit` file and load it if it exists.

## JS Usage

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

## Contributing

<a href="https://github.com/aklinker1/publish-browser-extension/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=aklinker1/publish-browser-extension" />
</a>

### Contributor Setup

1. Install [node](https://nodejs.org)
2. Install [`pnpm`](https://pnpm.io/)
   ```sh
   corepack enable
   ```
3. Install dependencies
   ```sh
   pnpm i
   ```
4. Run the `init` command to generate a `.env.submit` file for testing
   ```sh
   pnpm publish-extension init
   ```
   > [!WARNING]
   >
   > Make sure to set the Firefox channel to "unlisted", chrome's publish target to "trustedTesters", and don't submit the extension for review for Chrome or Edge. This will prevent you from accidentally releasing one of the test extensions publically.
5. Run the dev commands to upload a test extension to the stores:
   ```sh
   pnpm dev:all
   pnpm dev:chrome
   pnpm dev:firefox
   pnpm dev:edge
   ```
