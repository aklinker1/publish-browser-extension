<h1 align="center">Publish Browser Extension</h1>
<p align="center">Publish an extension to all the extension stores in a single command!</p>

###### Install

```bash
npm i -D publish-browser-extension
yarn add -D publish-browser-extension
pnpm add -D publish-browser-extension
```

###### CLI Usage

```bash
publish-extension \
    --chrome-zip dist/chrome.zip \
    --firefox-zip dist/firefox.zip \
    --firefox-sources-zip dist/sources.zip
```

###### JS Usage

```js
import { publishExtension } from 'publish-browser-extension';

publishExtension({
  chrome: {
    zip: 'dist/chrome.zip',
    // ...
  },
  firefox: {
    zip: 'dist/firefox.zip',
    sources: 'dist/sources.zip',
    // ...
  },
})
  .then(results => console.log(results))
  .catch(err => console.error(err));
```

### Supported Stores

- 🟢 **Chrome Web Store**
- 🟢 **Firefox Addons**
- 🔴 ~~_Microsoft Store_~~
- 🔴 ~~_App Store_~~
- 🔴 ~~_Opera Addons_~~

> If you'd like to add support for any of the unsupported 🔴 stores, feel free to open a PR! Firefox and Chrome are the only stores I'm publishing to right now, so I won't do the others until I need to publish there, _which may be never_.

## Documentation

For docs, run `publish-extension --help`. It includes everything you'll need: examples, flags, environment varialbes, etc.

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

The `dev` scripts are going to be the main way of manually testing the tool. You can create test extensions on the stores and use the `dev` to publish to them.

Before you create the extension listings, run `pnpm gulp buildExtension` to build a simple test extension, `extension/chrome.zip` and `extension/firefox.zip`. Use those ZIP files for the initial upload. **Make sure you also don't publish these test extensions publicly**, so:

1. Just don't submit the extension for review on the Chrome Web Store
2. Make the Firefox extension is marked as unlisted

Then update your `.env` file so the `dev` scripts don't publish them publicly either:

```env
CHROME_SKIP_SUBMIT_REVIEW=true
CHROME_PUBLISH_TARGET=trustedTesters
FIREFOX_CHANNEL=unlisted
```

Then you can run the `dev` scripts to manually test out changes:

```bash
# Chrome
pnpm dev:chrome

# Firefox
pnpm dev:firefox

# Chrome and Firefox
pnpm dev:all
```
