import fs from 'node:fs/promises';

export async function ensureZipExists(path: string) {
  try {
    await fs.lstat(path);
  } catch {
    throw Error('ZIP file does not exist: ' + path);
  }
}
