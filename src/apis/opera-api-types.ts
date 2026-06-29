export interface OperaAddonApiError {
  detail: string;
}

export interface OperaAddonDetails {
  id: number;
  slug: string;
  name: string;
  type: 'extensions' | (string & {});
  versions: Array<{
    version: string;
    submitted_for_moderation: boolean;
    type: string;
    created: string;
    warnings: string[];
    retirejs_warnings: unknown[];
  }>;
  published_versions: Array<{
    name: 'Opera' | (string & {});
    version: unknown | null;
  }>;
  developer: string; // uuid v4
  is_editable: boolean;
  app_id: string;
  category: {
    slug: string;
    name: string;
  };
  warnings: string[];
  unlisted: boolean;
  details_url: `https://addons.opera.com/en/${string}/details/${string}/`;
  is_published: boolean;
  available_auto_moderation: boolean;
  dev_promotional_image: unknown | null;
  is_extension: boolean;
  retirejs_warnings: unknown[];
}

export interface OperaAddonFileValidationResponse {
  version: string;
  submitted_for_moderation: boolean;
  type: string;
  created: string;
  warnings: string[];
}

export interface OperaAddonVersionDetails {
  version: string;
  submitted_for_moderation: boolean;
  support: unknown | null;
  source_url: string | null;
  service_url: string | null;
  source_for_moderators_url: string | null;
  build_instructions: string | null;
  features: unknown[];
  file_size: number;
  icon: {
    id: number;
    width: number;
    height: number;
    url: string;
  } | null;
  screenshots: Record<
    number,
    {
      id: number;
      url: string;
    }
  >;
  video: string | null;
  license: string | null;
  privacy_policy: string | null;
  translations: Record<
    string,
    {
      language: {
        code: string;
        name: string;
      };
      short_description: string;
      long_description: string;
      changelog: string | null;
    }
  >;
  type: 'Chromium Extension';
  created: string;
  warnings: unknown[];
  download_url: string;
  retirejs_warnings: unknown[];
}
