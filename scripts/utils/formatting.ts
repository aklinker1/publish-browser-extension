import prettierConfig from '../../.prettierrc.yml';
import { format } from 'prettier';

export function formatCode(path: string, content: string): Promise<string> {
  return format(content, { filepath: path, ...prettierConfig });
}
