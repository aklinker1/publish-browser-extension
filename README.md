<h1 align="center">Publish Browser Extension</h1>
<p align="center">Publish an extension to all the extension stores in a single command!</p>

https://github.com/aklinker1/publish-browser-extension/assets/10101283/b0e856ca-4e26-4c7e-9ff8-c900e203cab5

## Features

- Publish to the following stores:
  - [Chrome](https://developer.chrome.com/docs/webstore)
  - [Edge](https://microsoftedge.microsoft.com/addons/Microsoft-Edge-Extensions-Home)
  - [Firefox](https://addons.mozilla.org/en-US/firefox/extensions/)
  - [Opera](https://addons.opera.com/developer/)
  - [Safari](https://developer.apple.com/safari/extensions/) (macOS & iOS App Store)

- Helper script to generate secrets and configure options
- **Upload sources ZIP** to the Firefox Addon Store

> [!IMPORTANT]
>
> You are responsible for uploading and submitting an extension for the first time by hand. `publish-browser-extension` does not provide tools for creating a new extension.

## Install

```sh
npm i -D publish-browser-extension
pnpm i -D publish-browser-extension
bun i -D publish-browser-extension
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
  --edge-zip dist/chrome.zip \
  --opera-zip dist/opera.zip \
  --safari-project-path dist/safari
```

`publish-extension` will automatically look for a `.env.submit` file and load it if it exists.

### Safari App Store

Publishing to the Safari App Store requires **macOS with Xcode** installed (`xcodebuild`) and an [App Store Connect API Key](https://appstoreconnect.apple.com/access/integrations/api) (`.p8` file, Key ID, and Issuer ID).

- Locally, place `AuthKey_<KEY_ID>.p8` in `~/.appstoreconnect/private_keys/` (or pass `--safari-key-path` / `SAFARI_KEY_PATH`).
- In CI (e.g. GitHub Actions `macos-latest`), import your Apple Distribution `.p12` certificate into a temporary keychain before running `publish-extension` so `xcodebuild` can sign the archive:
  ```sh
  security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
  security default-keychain -s build.keychain
  security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
  echo "$APPLE_DIST_CERT_P12_BASE64" | base64 --decode > cert.p12
  security import cert.p12 -k build.keychain -P "$APPLE_DIST_CERT_PASSWORD" -T /usr/bin/codesign
  security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" build.keychain
  ```

## JS Usage

```js
import { publishExtension } from 'publish-browser-extension';

const results = await publishExtension({
  // ...
});
console.log(results);
```

## Options

Refer to the [Config Reference](./docs/config-reference.md).

## Contributing

<a href="https://github.com/aklinker1/publish-browser-extension/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=aklinker1/publish-browser-extension" />
</a>

### Contributor Setup

1. Install [bun](https://bun.sh/)
2. Install dependencies
   ```sh
   bun i
   ```
3. Run the `init` command to generate a `.env.submit` file for testing
   ```sh
   bun publish-extension init
   ```
   > [!WARNING]
   >
   > Make sure to set the Firefox channel to "unlisted", chrome's publish target to "trustedTesters", and don't submit the extension for review for Chrome or Edge. This will prevent you from accidentally releasing one of the test extensions publicly.
4. Run the dev commands to upload a test extension to the stores:
   ```sh
   bun dev:all
   bun dev:chrome
   bun dev:firefox
   bun dev:edge
   bun dev:opera
   ```
