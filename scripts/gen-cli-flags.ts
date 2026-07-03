import { kebabCase, camelCase } from 'scule';
import { replaceGeneratedContent } from './utils/code-gen-utils';
import { configMetas, getDefaultValue } from './utils/config-meta';

const lines: string[] = [
  '// prettier-ignore',
  '{',
  ...configMetas.map(meta => {
    const defaultValue = getDefaultValue(meta.schema);
    const description = `${meta.note ? `[${meta.note}] ` : ''}${meta.description}${defaultValue != null ? ` (default: ${JSON.stringify(defaultValue)})` : ''}`;
    return `  cli.option('--${kebabCase(meta.path)} [${camelCase(meta.path)}]', ${JSON.stringify(description)})`;
  }),
  '}',
];

await replaceGeneratedContent('src/cli.ts', 'cli-flags', lines.join('\n'));
