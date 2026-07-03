import { extname } from 'node:path';
import { formatCode } from './formatting';

const COMMENTS: Record<string, (str: string) => string> = {
  '.md': str => `<!-- ${str} -->`,
  '.ts': str => `/// ${str}`,
};

export async function replaceGeneratedContent(
  path: string,
  block: string,
  replacement: string,
): Promise<void> {
  const file = Bun.file(path);
  const ext = extname(path);
  const getComment = COMMENTS[ext];
  if (!getComment) throw Error(`Unsupported file extension: ${ext}`);

  const content = await file.text();
  const startComment = getComment(`gen-start:${block}`);

  const startIndex = content.indexOf(startComment) + startComment.length + 1;
  if (startIndex === -1) return;

  const endComment = getComment(`gen-end:${block}`);
  let endIndex = content.indexOf(endComment, startIndex) - 1;
  if (endIndex === -1) endIndex = content.length;

  const updatedContent =
    content.slice(0, startIndex) + replacement + content.slice(endIndex);

  const formatted = await formatCode(path, updatedContent);

  await file.write(formatted);
}
