import { snakeCase } from 'scule';
import { replaceGeneratedContent } from './utils/code-gen-utils';
import { configMetas } from './utils/config-meta';

const lines: string[] = [];

lines.push('export interface CustomEnv {');
for (const meta of configMetas) {
  const description =
    `${meta.note ? `[${meta.note}] ` : ''}${meta.extendedDescription ?? meta.description}`.split(
      '\n',
    );
  lines.push(
    ...(description.length === 1
      ? [`  /** ${description[0]} */`]
      : ['  /**', ...description.map(line => '   * ' + line), '   */']),
    `  ${snakeCase(meta.path).toUpperCase()}: string | undefined,`,
  );
}
lines.push('}');

await replaceGeneratedContent(
  'src/utils/env-utils.ts',
  'config-env',
  lines.join('\n'),
);
