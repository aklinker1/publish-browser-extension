import { kebabCase, flatCase, snakeCase } from 'scule';
import { configMetas, getDefaultValue } from './utils/config-meta';
import { replaceGeneratedContent } from './utils/code-gen-utils';

const lines = [
  '',
  // TOC
  ...configMetas.map(
    meta =>
      `- [\`${meta.path}\`](#${flatCase(meta.path)})${meta.note ? ` (${meta.note})` : ''}`,
  ),
  '',
  // Sections
  ...configMetas.flatMap(meta => {
    const defaultValue = getDefaultValue(meta.schema);
    return [
      `### \`${meta.path}\``,
      ...(meta.note ? [`> [!NOTE]`, `> ${meta.note}`, ''] : []),
      '',
      ...(defaultValue
        ? [`**Default:** \`${JSON.stringify(defaultValue)}\``, '']
        : []),
      meta.description,
      '',
      `- _CLI Flag_: \`--${kebabCase(meta.path)}\``,
      `- _Env Var_: \`${snakeCase(meta.path).toUpperCase()}\``,
    ];
  }),
  '',
];

await replaceGeneratedContent(
  'docs/config-reference.md',
  'config-docs',
  lines.join('\n'),
);
