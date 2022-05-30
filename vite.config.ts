import { execSync } from 'child_process';
import type { EmitFile, PreRenderedChunk } from 'rollup';
import { defineConfig, Plugin, normalizePath } from 'vite';
import path from 'path';
import pkg from './package.json';
import fs from 'fs/promises';

function tsc(): Plugin {
  async function emitDeclarationFiles(outDir: string, emitFile: EmitFile) {
    for (const file of await findDeclarationFiles(outDir)) {
      emitFile({
        type: 'asset',
        fileName: normalizePath(file),
        source: await fs.readFile(path.resolve(outDir, file)),
      });
    }
  }

  async function findDeclarationFiles(
    dir: string,
    base = dir,
  ): Promise<string[]> {
    const declarationFiles: string[] = [];
    const children = (await fs.readdir(dir)).map(filename =>
      path.resolve(dir, filename),
    );
    for (const child of children) {
      const info = await fs.lstat(child);
      if (info.isFile() && child.endsWith('.d.ts')) {
        declarationFiles.push(child.replace(base + '/', ''));
      } else if (info.isDirectory()) {
        declarationFiles.push(...(await findDeclarationFiles(child, base)));
      }
    }
    return declarationFiles;
  }

  let compiled = false;
  function runTsc() {
    if (compiled) return;
    process.stdout.write('\n');
    execSync('tsc -p tsconfig.build.json', {
      stdio: 'inherit',
    });
    compiled = true;
  }
  return {
    name: 'tsc',
    async generateBundle(options, _bundle, isWrite) {
      if (!isWrite) return;
      if (!options.dir) throw Error('rollup output directory does not exist');

      runTsc();
      await emitDeclarationFiles(options.dir, this.emitFile);
    },
  };
}

function getOutputFilename(ext: string) {
  return (chunk: PreRenderedChunk) => `${chunk.name}${ext}`;
}

export default defineConfig({
  plugins: [tsc()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: pkg.name,
    },
    rollupOptions: {
      input: {
        index: 'src/index.ts',
        cli: 'src/cli.ts',
      },
      output: [
        {
          entryFileNames: getOutputFilename('.js'),
          format: 'commonjs',
          exports: 'named',
          // This string doesn't matter, just including this method disables chunks
          manualChunks: () => 'anything.js',
        },
      ],
    },
  },
});
