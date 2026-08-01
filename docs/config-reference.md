# Config Reference

<!-- gen-start:config-docs -->

- [`dryRun`](#dryrun)
- [`chrome.apiVersion`](#chromeapiversion)
- [`chrome.deployPercentage`](#chromedeploypercentage)
- [`chrome.extensionId`](#chromeextensionid)
- [`chrome.skipSubmitReview`](#chromeskipsubmitreview)
- [`chrome.zip`](#chromezip)
- [`chrome.cancelPending`](#chromecancelpending) (API v2 only)
- [`chrome.publisherId`](#chromepublisherid) (API v2 only)
- [`chrome.publishType`](#chromepublishtype) (API v2 only)
- [`chrome.serviceAccountClientEmail`](#chromeserviceaccountclientemail) (API v2 only)
- [`chrome.serviceAccountPrivateKey`](#chromeserviceaccountprivatekey) (API v2 only)
- [`chrome.skipReview`](#chromeskipreview) (API v2 only)
- [`chrome.clientId`](#chromeclientid) (Deprecated: API v1.1 only)
- [`chrome.clientSecret`](#chromeclientsecret) (Deprecated: API v1.1 only)
- [`chrome.publishTarget`](#chromepublishtarget) (Deprecated: API v1.1 only)
- [`chrome.refreshToken`](#chromerefreshtoken) (Deprecated: API v1.1 only)
- [`chrome.reviewExemption`](#chromereviewexemption) (Deprecated: API v1.1 only)
- [`edge.apiKey`](#edgeapikey)
- [`edge.clientId`](#edgeclientid)
- [`edge.productId`](#edgeproductid)
- [`edge.skipSubmitReview`](#edgeskipsubmitreview)
- [`edge.zip`](#edgezip)
- [`firefox.channel`](#firefoxchannel)
- [`firefox.compatibility`](#firefoxcompatibility)
- [`firefox.extensionId`](#firefoxextensionid)
- [`firefox.jwtIssuer`](#firefoxjwtissuer)
- [`firefox.jwtSecret`](#firefoxjwtsecret)
- [`firefox.skipSubmitReview`](#firefoxskipsubmitreview)
- [`firefox.sourcesZip`](#firefoxsourceszip)
- [`firefox.zip`](#firefoxzip)
- [`opera.packageId`](#operapackageid)
- [`opera.sessionId`](#operasessionid)
- [`opera.skipSubmitReview`](#operaskipsubmitreview)
- [`opera.zip`](#operazip)
- [`safari.apiIssuerId`](#safariapiissuerid)
- [`safari.apiKeyId`](#safariapikeyid)
- [`safari.apiPrivateKeyPath`](#safariapiprivatekeypath)
- [`safari.bundlePath`](#safaribundlepath)
- [`safari.bundleType`](#safaribundletype)

### `dryRun`

Check authentication, but don't upload the zip or submit for review

- _CLI Flag_: `--dry-run`
- _Env Var_: `DRY_RUN`

### `chrome.apiVersion`

The API version to use for the Chrome Web Store: "v1.1" or "v2"

- _CLI Flag_: `--chrome-api-version`
- _Env Var_: `CHROME_API_VERSION`

### `chrome.deployPercentage`

An integer from 0-100

- _CLI Flag_: `--chrome-deploy-percentage`
- _Env Var_: `CHROME_DEPLOY_PERCENTAGE`

### `chrome.extensionId`

The ID of the extension to be submitted

- _CLI Flag_: `--chrome-extension-id`
- _Env Var_: `CHROME_EXTENSION_ID`

### `chrome.skipSubmitReview`

Just upload the extension zip, don't submit it for review or publish it

- _CLI Flag_: `--chrome-skip-submit-review`
- _Env Var_: `CHROME_SKIP_SUBMIT_REVIEW`

### `chrome.zip`

Path to extension zip to upload

- _CLI Flag_: `--chrome-zip`
- _Env Var_: `CHROME_ZIP`

### `chrome.cancelPending`

> [!NOTE]
> API v2 only

Cancel any pending review before submitting the new version

- _CLI Flag_: `--chrome-cancel-pending`
- _Env Var_: `CHROME_CANCEL_PENDING`

### `chrome.publisherId`

> [!NOTE]
> API v2 only

Publisher ID who owns the extension

- _CLI Flag_: `--chrome-publisher-id`
- _Env Var_: `CHROME_PUBLISHER_ID`

### `chrome.publishType`

> [!NOTE]
> API v2 only

Set to "STAGED_PUBLISH" to not publish the extension immediately after submission

- _CLI Flag_: `--chrome-publish-type`
- _Env Var_: `CHROME_PUBLISH_TYPE`

### `chrome.serviceAccountClientEmail`

> [!NOTE]
> API v2 only

Client email of the service account used for authorizing requests to the Chrome Web Store

- _CLI Flag_: `--chrome-service-account-client-email`
- _Env Var_: `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`

### `chrome.serviceAccountPrivateKey`

> [!NOTE]
> API v2 only

Private key of the service account used for authorizing requests to the Chrome Web Store

- _CLI Flag_: `--chrome-service-account-private-key`
- _Env Var_: `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY`

### `chrome.skipReview`

> [!NOTE]
> API v2 only

Some updates, like ad-blocker rule updates, can skip the review process and be published immediately after submission

- _CLI Flag_: `--chrome-skip-review`
- _Env Var_: `CHROME_SKIP_REVIEW`

### `chrome.clientId`

> [!NOTE]
> Deprecated: API v1.1 only

Client ID used for authorizing requests to the Chrome Web Store

- _CLI Flag_: `--chrome-client-id`
- _Env Var_: `CHROME_CLIENT_ID`

### `chrome.clientSecret`

> [!NOTE]
> Deprecated: API v1.1 only

Client secret used for authorizing requests to the Chrome Web Store

- _CLI Flag_: `--chrome-client-secret`
- _Env Var_: `CHROME_CLIENT_SECRET`

### `chrome.publishTarget`

> [!NOTE]
> Deprecated: API v1.1 only

Group to publish to, "default" or "trustedTesters"

- _CLI Flag_: `--chrome-publish-target`
- _Env Var_: `CHROME_PUBLISH_TARGET`

### `chrome.refreshToken`

> [!NOTE]
> Deprecated: API v1.1 only

Refresh token used for authorizing requests to the Chrome Web Store

- _CLI Flag_: `--chrome-refresh-token`
- _Env Var_: `CHROME_REFRESH_TOKEN`

### `chrome.reviewExemption`

> [!NOTE]
> Deprecated: API v1.1 only

Submit update using expedited review process

- _CLI Flag_: `--chrome-review-exemption`
- _Env Var_: `CHROME_REVIEW_EXEMPTION`

### `edge.apiKey`

API key used for authorizing requests to Microsofts addon API v1.1

- _CLI Flag_: `--edge-api-key`
- _Env Var_: `EDGE_API_KEY`

### `edge.clientId`

Client ID used for authorizing requests to Microsofts addon API

- _CLI Flag_: `--edge-client-id`
- _Env Var_: `EDGE_CLIENT_ID`

### `edge.productId`

Product ID listed on the developer dashboard

- _CLI Flag_: `--edge-product-id`
- _Env Var_: `EDGE_PRODUCT_ID`

### `edge.skipSubmitReview`

Just upload the extension zip, don't submit it for review or publish it

- _CLI Flag_: `--edge-skip-submit-review`
- _Env Var_: `EDGE_SKIP_SUBMIT_REVIEW`

### `edge.zip`

Path to extension zip to upload

- _CLI Flag_: `--edge-zip`
- _Env Var_: `EDGE_ZIP`

### `firefox.channel`

**Default:** `"listed"`

The channel to publish to, "listed" or "unlisted"

- _CLI Flag_: `--firefox-channel`
- _Env Var_: `FIREFOX_CHANNEL`

### `firefox.compatibility`

Comma-separated list of compatible applications, e.g. "firefox,android" - "firefox" for compatibility with Firefox desktop apps, "android" for Firefox Android apps

- _CLI Flag_: `--firefox-compatibility`
- _Env Var_: `FIREFOX_COMPATIBILITY`

### `firefox.extensionId`

The ID of the extension to be submitted

- _CLI Flag_: `--firefox-extension-id`
- _Env Var_: `FIREFOX_EXTENSION_ID`

### `firefox.jwtIssuer`

Issuer used for authorizing requests to Addon Store APIs

- _CLI Flag_: `--firefox-jwt-issuer`
- _Env Var_: `FIREFOX_JWT_ISSUER`

### `firefox.jwtSecret`

Secret used for authorizing requests to Addon Store APIs

- _CLI Flag_: `--firefox-jwt-secret`
- _Env Var_: `FIREFOX_JWT_SECRET`

### `firefox.skipSubmitReview`

Just upload the extension zip, don't submit it for review or publish it

- _CLI Flag_: `--firefox-skip-submit-review`
- _Env Var_: `FIREFOX_SKIP_SUBMIT_REVIEW`

### `firefox.sourcesZip`

Path to sources zip to upload

- _CLI Flag_: `--firefox-sources-zip`
- _Env Var_: `FIREFOX_SOURCES_ZIP`

### `firefox.zip`

Path to extension zip to upload

- _CLI Flag_: `--firefox-zip`
- _Env Var_: `FIREFOX_ZIP`

### `opera.packageId`

Package ID listed in the package developer URL: https://addons.opera.com/developer/package/<packageId>

- _CLI Flag_: `--opera-package-id`
- _Env Var_: `OPERA_PACKAGE_ID`

### `opera.sessionId`

Session ID used for authorizing requests to Opera Addons API

- _CLI Flag_: `--opera-session-id`
- _Env Var_: `OPERA_SESSION_ID`

### `opera.skipSubmitReview`

Just upload the extension zip, don't submit it for review or publish it

- _CLI Flag_: `--opera-skip-submit-review`
- _Env Var_: `OPERA_SKIP_SUBMIT_REVIEW`

### `opera.zip`

Path to extension zip to upload

- _CLI Flag_: `--opera-zip`
- _Env Var_: `OPERA_ZIP`

### `safari.apiIssuerId`

App Store Connect API Issuer ID

- _CLI Flag_: `--safari-api-issuer-id`
- _Env Var_: `SAFARI_API_ISSUER_ID`

### `safari.apiKeyId`

App Store Connect API Key ID

- _CLI Flag_: `--safari-api-key-id`
- _Env Var_: `SAFARI_API_KEY_ID`

### `safari.apiPrivateKeyPath`

Path to the .p8 App Store Connect API private key file

- _CLI Flag_: `--safari-api-private-key-path`
- _Env Var_: `SAFARI_API_PRIVATE_KEY_PATH`

### `safari.bundlePath`

Path to the .pkg (macOS) or .ipa (iOS) bundle to upload

- _CLI Flag_: `--safari-bundle-path`
- _Env Var_: `SAFARI_BUNDLE_PATH`

### `safari.bundleType`

**Default:** `"macos"`

The type of bundle being uploaded: "macos", "ios", or "osx" (default: "macos")

- _CLI Flag_: `--safari-bundle-type`
- _Env Var_: `SAFARI_BUNDLE_TYPE`

<!-- gen-end:config-docs -->
