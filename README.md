<h1 align="center">Publish Browser Extension</h1>
<p align="center">Publish an extension to all the extension stores in a single command!</p>

###### Install

```bash
npm i -D browser-extension-publisher
yarn add -D browser-extension-publisher
pnpm add -D browser-extension-publisher
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
  chrome: 'dist/chrome.zip',
  firefox: 'dist/firefox.zip',
  firefoxSources: 'dist/sources.zip',
})
  .then(results => {
    console.log(results);
  })
  .catch(console.error);
```

## Supported Stores

With this tool you can publish to the following extension stores:

- [x] Chrome Web Store
- [x] Firefox Addons

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
4. Create `.env` file
   ```bash
   pnpm setup:env
   ```

### Scripts

Checkout the scripts in the package.json, they're all self-explanatory, but here are some examples:

```bash
pnpm format        # Run prettier to format source code
pnpm test          # Run unit tests
pnpm test-publish  # Actually publish the test extension
```
