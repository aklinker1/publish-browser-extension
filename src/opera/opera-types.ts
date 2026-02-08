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
