import { validate, type Struct } from 'superstruct';
import {
  ChromeWebStoreV2Options,
  ChromeWebStoreV1_1Options,
  EdgeAddonStoreV1_1Options,
  FirefoxAddonStoreV5Options,
  OperaAddonsStoreOptions,
  SafariAddonStoreOptions,
  ResolvedConfig,
  isMetaStruct,
  type MetaStruct,
} from '../../src/utils/config-schema';

const schemasWithOptions = [
  ...Object.values(ResolvedConfig.schema),
  ...Object.values(ChromeWebStoreV2Options.schema),
  ...Object.values(ChromeWebStoreV1_1Options.schema),
  ...Object.values(EdgeAddonStoreV1_1Options.schema),
  ...Object.values(FirefoxAddonStoreV5Options.schema),
  ...Object.values(OperaAddonsStoreOptions.schema),
  ...Object.values(SafariAddonStoreOptions.schema),
].filter(schema => isMetaStruct(schema as Struct<any>)) as MetaStruct<any>[];

const seenPaths = new Set<string>();

export const configMetas = schemasWithOptions
  .toSorted(
    (a, b) =>
      // dryRun first
      a['~meta'].path.split('.').length - b['~meta'].path.split('.').length ||
      // Next, sort by store name
      a['~meta'].path
        .split('.')[0]!
        .localeCompare(b['~meta'].path.split('.')[0]!) ||
      // Then group by note
      (a['~meta'].note ?? '').localeCompare(b['~meta'].note ?? '') ||
      // Finally, alphabetical order
      a['~meta'].path.localeCompare(b['~meta'].path),
  )
  .filter(
    schema =>
      !seenPaths.has(schema['~meta'].path) &&
      seenPaths.add(schema['~meta'].path),
  )
  .map(schema => ({ ...schema['~meta'], schema }));

export const nestedPaths = [
  ...new Set(
    configMetas
      .map(meta => meta.path.split('.').slice(0, -1))
      .filter(path => path.length > 0)
      .map(parts => parts.join('')),
  ),
].toSorted();

export function getDefaultValue<T>(schema: Struct<T>): T {
  const [_, defaultValue] = validate(undefined!, schema, { coerce: true });
  return defaultValue as T;
}
