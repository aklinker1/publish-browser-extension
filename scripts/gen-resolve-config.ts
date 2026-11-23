import { replaceGeneratedContent } from './utils/code-gen-utils';
import { configMetas } from './utils/config-meta';
import { snakeCase } from 'scule';

const nestedPaths = [
  ...new Set(
    configMetas
      .map(meta => meta.path.split('.').slice(0, -1))
      .filter(path => path.length > 0)
      .map(parts => parts.join(''))
      .toSorted(),
  ),
];
const storeNamePadding = nestedPaths.reduce(
  (max, path) => Math.max(max, path.length),
  0,
);

const allPathsPadding = configMetas.reduce(
  (max, meta) => Math.max(max, meta.path.length),
  0,
);

const renderValue = (meta: { path: string }, padding = allPathsPadding) => {
  return `(config as any)?.${meta.path.replaceAll('.', '?.').padEnd(padding + 1)} ?? process.env.${snakeCase(
    meta.path,
  ).toUpperCase()}`;
};

const STORE_TRIGGER_FIELD: Record<string, string> = {
  safari: 'projectPath',
};

const triggerFieldFor = (store: string) => STORE_TRIGGER_FIELD[store] ?? 'zip';
const triggerVarFor = (store: string) => {
  const field = triggerFieldFor(store);
  return store + field[0]!.toUpperCase() + field.slice(1);
};
const triggerVarPadding = nestedPaths.reduce(
  (max, store) => Math.max(max, triggerVarFor(store).length),
  0,
);
const triggerPathPadding = nestedPaths.reduce(
  (max, store) => Math.max(max, `${store}.${triggerFieldFor(store)}`.length),
  0,
);

const lines: string[] = [
  `// prettier-ignore`,
  `/**`,
  ` * Given inline config, read environment variables and apply defaults.`,
  ` * The return value is a deep partial of the ResolvedConfig type - call`,
  ` * \`validateConfig\` to make sure all required options are passed`,
  ` */`,
  `export function resolveConfig(config?: InlineConfig): PartialResolvedConfig {`,
  `  const raw: Record<string, any> = {}`,
  ``,
  '  // Init store objects',
  ...nestedPaths.map(
    store =>
      `  const ${triggerVarFor(store).padEnd(triggerVarPadding)} = ${renderValue({ path: `${store}.${triggerFieldFor(store)}` }, triggerPathPadding)}`,
  ),
  ``,
  ...nestedPaths.map(
    store =>
      `  if ${('(' + triggerVarFor(store) + ')').padEnd(triggerVarPadding + 2)} raw.${store.padEnd(storeNamePadding)} ??= {}`,
  ),
  ``,
  '  // Set values',
  ...configMetas.map(meta => {
    const parentParts = meta.path.split('.').slice(0, -1);
    const ifStatement =
      parentParts.length === 0
        ? ''
        : `if ${('(raw.' + parentParts.join('.') + ')').padEnd(storeNamePadding + 6)} `;
    return `  ${ifStatement}raw.${meta.path.padEnd(allPathsPadding)} = ${renderValue(meta)}`;
  }),
  ``,
  `  return validateConfigWith(raw, PartialResolvedConfig);`,
  `}`,
];

await replaceGeneratedContent(
  'src/config.ts',
  'config-resolver',
  lines.join('\n'),
);
