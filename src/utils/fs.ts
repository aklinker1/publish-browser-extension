import { openAsBlob } from 'node:fs';
import fs from 'node:fs/promises';
import { basename } from 'node:path';

export async function ensureZipExists(path: string) {
  try {
    await fs.lstat(path);
  } catch {
    throw Error('ZIP file does not exist: ' + path);
  }
}

export async function openAsFile(path: string): Promise<File> {
  const blob = await openAsBlob(path);
  return new File([blob], basename(path));
}
