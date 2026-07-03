import { snakeCase } from 'scule';
import { replaceGeneratedContent } from './utils/code-gen-utils';
import { configMetas } from './utils/config-meta';

const lines: string[] = [];

lines.push('export interface CustomEnv {');
for (const meta of configMetas) {
  lines.push(
    `  /** ${meta.note ? `[${meta.note}] ` : ''}${meta.description} */`,
    `  ${snakeCase(meta.path).toUpperCase()}: string | undefined,`,
  );
}
lines.push('}');

await replaceGeneratedContent(
  'src/utils/env-utils.ts',
  'config-env',
  lines.join('\n'),
);
