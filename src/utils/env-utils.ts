/// gen-start:config-env
export interface CustomEnv {
  /** Check authentication, but don't upload the zip or submit for review */
  DRY_RUN: string | undefined;
  /** The API version to use for the Chrome Web Store: "v1.1" or "v2" */
  CHROME_API_VERSION: string | undefined;
  /** An integer from 0-100 */
  CHROME_DEPLOY_PERCENTAGE: string | undefined;
  /** The ID of the extension to be submitted */
  CHROME_EXTENSION_ID: string | undefined;
  /** Just upload the extension zip, don't submit it for review or publish it */
  CHROME_SKIP_SUBMIT_REVIEW: string | undefined;
  /** Path to extension zip to upload */
  CHROME_ZIP: string | undefined;
  /** [API v2 only] Cancel any pending review before submitting the new version */
  CHROME_CANCEL_PENDING: string | undefined;
  /** [API v2 only] Publisher ID who owns the extension */
  CHROME_PUBLISHER_ID: string | undefined;
  /** [API v2 only] Set to "STAGED_PUBLISH" to not publish the extension immediately after submission */
  CHROME_PUBLISH_TYPE: string | undefined;
  /** [API v2 only] Client email of the service account used for authorizing requests to the Chrome Web Store */
  CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL: string | undefined;
  /** [API v2 only] Private key of the service account used for authorizing requests to the Chrome Web Store */
  CHROME_SERVICE_ACCOUNT_PRIVATE_KEY: string | undefined;
  /** [API v2 only] Some updates, like ad-blocker rule updates, can skip the review process and be published immediately after submission */
  CHROME_SKIP_REVIEW: string | undefined;
  /** [Deprecated: API v1.1 only] Client ID used for authorizing requests to the Chrome Web Store */
  CHROME_CLIENT_ID: string | undefined;
  /** [Deprecated: API v1.1 only] Client secret used for authorizing requests to the Chrome Web Store */
  CHROME_CLIENT_SECRET: string | undefined;
  /** [Deprecated: API v1.1 only] Group to publish to, "default" or "trustedTesters" */
  CHROME_PUBLISH_TARGET: string | undefined;
  /** [Deprecated: API v1.1 only] Refresh token used for authorizing requests to the Chrome Web Store */
  CHROME_REFRESH_TOKEN: string | undefined;
  /** [Deprecated: API v1.1 only] Submit update using expedited review process */
  CHROME_REVIEW_EXEMPTION: string | undefined;
  /** API key used for authorizing requests to Microsofts addon API v1.1 */
  EDGE_API_KEY: string | undefined;
  /** Client ID used for authorizing requests to Microsofts addon API */
  EDGE_CLIENT_ID: string | undefined;
  /** Product ID listed on the developer dashboard */
  EDGE_PRODUCT_ID: string | undefined;
  /** Just upload the extension zip, don't submit it for review or publish it */
  EDGE_SKIP_SUBMIT_REVIEW: string | undefined;
  /** Path to extension zip to upload */
  EDGE_ZIP: string | undefined;
  /** The channel to publish to, "listed" or "unlisted" */
  FIREFOX_CHANNEL: string | undefined;
  /** Comma-separated list of compatible applications, e.g. "firefox,android" - "firefox" for compatibility with Firefox desktop apps, "android" for Firefox Android apps */
  FIREFOX_COMPATIBILITY: string | undefined;
  /** The ID of the extension to be submitted */
  FIREFOX_EXTENSION_ID: string | undefined;
  /** Issuer used for authorizing requests to Addon Store APIs */
  FIREFOX_JWT_ISSUER: string | undefined;
  /** Secret used for authorizing requests to Addon Store APIs */
  FIREFOX_JWT_SECRET: string | undefined;
  /** Just upload the extension zip, don't submit it for review or publish it */
  FIREFOX_SKIP_SUBMIT_REVIEW: string | undefined;
  /** Path to sources zip to upload */
  FIREFOX_SOURCES_ZIP: string | undefined;
  /** Path to extension zip to upload */
  FIREFOX_ZIP: string | undefined;
  /** Package ID listed in the package developer URL: https://addons.opera.com/developer/package/<packageId> */
  OPERA_PACKAGE_ID: string | undefined;
  /** Session ID used for authorizing requests to Opera Addons API */
  OPERA_SESSION_ID: string | undefined;
  /** Just upload the extension zip, don't submit it for review or publish it */
  OPERA_SKIP_SUBMIT_REVIEW: string | undefined;
  /** Path to extension zip to upload */
  OPERA_ZIP: string | undefined;
}
/// gen-end:config-env

declare global {
  namespace NodeJS {
    interface ProcessEnv extends CustomEnv {}
  }
}
