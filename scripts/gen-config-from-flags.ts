import { camelCase } from 'scule';
import { replaceGeneratedContent } from './utils/code-gen-utils';
import { configMetas, nestedPaths } from './utils/config-meta';

const lines: string[] = [
  '// prettier-ignore',
  'function configFromFlags(flags: any): InlineConfig {',
  '  const config: any = {}',
  '',
  '  // Init store objects',
  ...nestedPaths.map(path => `  config.${path} ??= {}`),
  '',
  '  // Set values',
  ...configMetas.map(
    meta => `  config.${meta.path} = flags.${camelCase(meta.path)}`,
  ),
  '',
  '  return config',
  '}',
];

await replaceGeneratedContent(
  'src/cli.ts',
  'config-from-flags',
  lines.join('\n'),
);
