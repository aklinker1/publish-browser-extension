export namespace CwsApiV1_1 {
  export const BASE_URL = 'https://chromewebstore.googleapis.com/';

  export type Item = {
    /**
     * The CRX version of the item. If the projection is draft, then it is the draft's CRX version.
     */
    crxVersion?: string;
    /**
     * Unique ID of the item.
     */
    id?: string;
    /**
     * Detail human-readable status of the operation, in English only. Same error messages are displayed when you upload your app to the Chrome Web Store.
     */
    itemError?: Array<ItemError>;
    /**
     * Identifies this resource as an Item. Value: the fixed string "chromewebstore#item".
     */
    kind?: string;
    /**
     * Public key of this item.
     */
    publicKey?: string;
    /**
     * Status of the operation. Possible values are: - \"FAILURE\" - \"IN_PROGRESS\" - \"NOT_FOUND\" - \"SUCCESS\"
     */
    uploadState?: string;
  };

  export type Item2 = {
    /**
     * The ID of this item.
     */
    item_id?: string;
    /**
     * Static string value is always "chromewebstore#item".
     */
    kind?: string;
    /**
     * The status code of this publish operation. It may contain multiple elements from the following list: NOT_AUTHORIZED, INVALID_DEVELOPER, DEVELOPER_NO_OWNERSHIP, DEVELOPER_SUSPENDED, ITEM_NOT_FOUND, ITEM_PENDING_REVIEW, ITEM_TAKEN_DOWN, PUBLISHER_SUSPENDED.
     */
    status?: Array<string>;
    /**
     * Detailed human-comprehensible explanation of the status code above.
     */
    statusDetail?: Array<string>;
  };

  export type ItemError = {
    /**
     * The error code.
     */
    error_code?: string;
    /**
     * The human-readable detail message of the error.
     */
    error_detail?: string;
  };

  export type PublishRequest = {
    /**
     * The target deploy percentage of the item. It's only useful for items with big user base.
     */
    deployPercentage?: number;
    /**
     * Optional. The caller request to exempt the review and directly publish because the update is within the list that we can automatically validate. The API will check if the exemption can be granted using real time data.
     */
    reviewExemption?: boolean;
    /**
     * The publish target of this publish operation. This is the same as using publishTarget as a URL query parameter. The string value can either be target="trustedTesters" or target="default". The default value, if none is supplied, is target="default". Recommended usage is to use the URL query parameter to specificy the value.
     */
    target?: string;
  };

  export type Endpoints = {
    GET: {
      '/chromewebstore/v1.1/items/{itemId}': {
        params: {
          /**
           * Unique identifier representing the Chrome App, Chrome Extension, or the Chrome Theme.
           */
          itemId: string;
        };
        query?: {
          /**
           * Determines which subset of the item information to return.
           */
          projection?: 'DRAFT' | 'PUBLISHED';
        };

        response: { type: 'json'; value: Item };
      };
    };
    POST: {
      '/upload/chromewebstore/v1.1/items': {
        query?: {
          /**
           * The email of the publisher who owns the items. Defaults to the caller's email address.
           */
          publisherEmail?: string;
        };
        body: Bun.BodyInit;
        response: { type: 'json'; value: Item };
      };
      '/chromewebstore/v1.1/items/{itemId}/publish': {
        params: {
          /**
           * The ID of the item to publish.
           */
          itemId: string;
        };
        query?: {
          /**
           * The deploy percentage you want to set for your item. Valid values are [0, 100]. If set to any number less than 100, only that many percentage of users will be allowed to get the update.
           */
          deployPercentage?: number;
          /**
           * Provide defined publishTarget in URL (case sensitive): publishTarget="trustedTesters" or publishTarget="default". Defaults to publishTarget="default".
           */
          publishTarget?: string;
          /**
           * Optional. The caller request to exempt the review and directly publish because the update is within the list that we can automatically validate. The API will check if the exemption can be granted using real time data.
           */
          reviewExemption?: boolean;
        };
        body: PublishRequest;
        response: { type: 'json'; value: Item2 };
      };
    };
    PUT: {
      '/upload/chromewebstore/v1.1/items/{itemId}': {
        params: {
          /**
           * The ID of the item to upload.
           */
          itemId: string;
        };

        body: Bun.BodyInit;
        response: { type: 'json'; value: Item };
      };
    };
  };
}
