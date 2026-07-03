import { kebabCase, camelCase } from 'scule';
import { replaceGeneratedContent } from './utils/code-gen-utils';
import { configMetas, getDefaultValue } from './utils/config-meta';

const lines: string[] = ['// prettier-ignore', '{'];

for (const meta of configMetas) {
  const defaultValue = getDefaultValue(meta.schema);
  const description = `${meta.note ? `[${meta.note}] ` : ''}${meta.description}${defaultValue != null ? ` (default: ${JSON.stringify(defaultValue)})` : ''}`;
  lines.push(
    `  cli.option('--${kebabCase(meta.path)} [${camelCase(meta.path)}]', ${JSON.stringify(description)})`,
  );
}
lines.push('}');

await replaceGeneratedContent('src/cli.ts', 'cli-flags', lines.join('\n'));
