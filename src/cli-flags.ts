import { parseFlag, parseRequiredStringFlag } from './utils/flags';

export const cliFlags = {
  // General
  help: () => parseFlag('help', 'boolean', 'Shows this help message.'),
  noColor: () =>
    parseFlag('no-color', 'boolean', 'Disable colored output in the terminal'),

  // Chrome
  chromeZip: () =>
    parseFlag(
      'chrome-zip',
      'string',
      'The path to the ZIP file you want to upload to the chrome web store. When not passed, the Chrome Web Store is skipped.',
    ),
  chromeExtensionId: () =>
    parseRequiredStringFlag(
      'chrome-extension-id',
      "The ID of the chrome extension you're publishing to. You should upload the extension once by hand to get this value. Required when --chrome-zip is passed.",
    ),
  chromeClientId: () =>
    parseRequiredStringFlag(
      'chrome-client-id',
      'Client ID used for authorizing requests to the Chrome Web Store. Required when --chrome-zip is passed.\nSee https://developer.chrome.com/docs/webstore/using_webstore_api/ to get started.',
    ),
  chromeClientSecret: () =>
    parseRequiredStringFlag(
      'chrome-client-secret',
      'Client secret used for authorizing requests to the Chrome Web Store. Required when --chrome-zip is passed.\nSee https://developer.chrome.com/docs/webstore/using_webstore_api/ to get started.',
    ),
  chromeRefreshToken: () =>
    parseRequiredStringFlag(
      'chrome-refresh-token',
      'Refresh token used for authorizing requests to the Chrome Web Store. Required when --chrome-zip is passed.\nSee https://developer.chrome.com/docs/webstore/using_webstore_api/ to get started.',
    ),
  chromePublishTarget: () =>
    parseFlag<'default' | 'trustedTesters'>(
      'chrome-publish-target',
      'string',
      "Where you would like to publish the extension to, 'trustedTesters' or 'default'. Not required, defaults to 'default'.",
    ),

  // Firefox
  firefoxZip: () =>
    parseFlag(
      'firefox-zip',
      'string',
      'The path to the ZIP file you want to upload to the Firefox Addon Store. When not passed, the Firefox Addon Store is skipped.',
    ),
  firefoxSourcesZip: () =>
    parseFlag(
      'firefox-sources-zip',
      'string',
      'The path to the ZIP file containing your source code for manual review. When not passed, no sources are uploaded for the version uploaded by --firefox-zip.',
    ),
  firefoxExtensionId: () =>
    parseRequiredStringFlag(
      'firefox-extension-id',
      "The ID of the extension you're publishing to. You should upload the extension once by hand to get this value. Required when --firefox-zip is passed.",
    ),
  firefoxJwtIssuer: () =>
    parseRequiredStringFlag(
      'firefox-jwt-issuer',
      'One of your credentials for interacting with the Addon Store APIs.\nSee https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-sign to get started',
    ),
  firefoxJwtSecret: () =>
    parseRequiredStringFlag(
      'firefox-jwt-secret',
      'One of your credentials for interacting with the Addon Store APIs.\nSee https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-sign to get started',
    ),
  firefoxChannel: () =>
    parseFlag<'listed' | 'unlisted'>(
      'firefox-channel',
      'string',
      "What channel you would like to publish the extension to, 'listed' or 'unlisted'. Not required, defaults to 'listed'.",
    ),
};
