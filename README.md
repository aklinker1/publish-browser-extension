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

## Supported Stores

With this tool you can publish to the following extension stores:

- Chrome Web Store
- Firefox Addons

And here are the stores that are not supported:

- Microsoft Store (Edge)
- App Store (Safari)
- Opera Addons

> If you want to add support for one of these stores, please open a PR

## Contributors

<a href="https://github.com/aklinker1/publish-browser-extension/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=aklinker1/publish-browser-extension" />
</a>

## Usage

For documentation, see the help output from the CLI tool. It includes everything you'll need: examples, flags, environment varialbes, etc.

```bash
publish-extension --help
```

## Contributing

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

Checkout the scripts in the package.json, they're all self-explanatory, but here are some examples:

```bash
pnpm format        # Run prettier to format source code
pnpm test          # Run unit tests
```

### Manual Testing

The `dev:*` scripts are going to be the main way of manually testing the extension. You can create
test extensions on the stores and use the tool to publish to them.

When you create the extension listings, first run `pnpm gulp buildExtension` to build a simple test extension. That command will output `extension/chrome.zip` and `extension/firefox.zip`. Use those ZIP files for the initial upload. Make sure you also don't publish these test extensions publicly, so just don't publish it for chrome, and make the firefox extension unlisted.

Then update your `.env` file so the `dev:*` scripts don't publish them publicly either:

- `CHROME_SKIP_SUBMIT_REVIEW=true`
- `CHROME_PUBLISH_TARGET=trustedTesters`
- `FIREFOX_CHANNEL=unlisted`

Then run any of the following to actually upload the test extension to the stores:

```bash
# Chrome
pnpm dev:chrome

# Firefox
pnpm dev:firefox

# Chrome and Firefox
pnpm dev:all
```
