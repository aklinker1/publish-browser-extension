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

const renderValue = (
  meta: { path: string; default?: any },
  padding = allPathsPadding,
) =>
  `(config as any)?.${meta.path.replaceAll('.', '?.').padEnd(padding + 1)} ?? process.env.${snakeCase(
    meta.path,
  )
    .toUpperCase()
    .padEnd(
      meta.default == null ? 0 : padding,
    )}${meta.default == null ? `` : ` ?? ${JSON.stringify(meta.default)}`}`;

const lines: string[] = [
  `// prettier-ignore`,
  `/**`,
  ` * Given inline config, read environment variables and apply defaults. Throws an`,
  ` * error if any config is missing.`,
  ` */`,
  `export function resolveConfig(config?: InlineConfig): ResolvedConfig {`,
  `  const raw: Record<string, any> = {}`,
  ``,
  '  // Init store objects',
  ...nestedPaths.map(
    path =>
      `  const ${(path + 'Zip').padEnd(storeNamePadding + 3)} = ${renderValue({ path: path + '.zip' }, storeNamePadding + 4)}`,
  ),
  ``,
  ...nestedPaths.map(
    path =>
      `  if ${('(' + path + 'Zip)').padEnd(storeNamePadding + 5)} raw.${path.padEnd(storeNamePadding)} ??= {}`,
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
  `  return validateConfig(raw);`,
  `}`,
];

await replaceGeneratedContent(
  'src/config.ts',
  'config-resolver',
  lines.join('\n'),
);
