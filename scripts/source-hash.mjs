import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

/**
 * Deterministic hash of everything that shapes the runnable application.
 * Used by the build to stamp dist/ and by server.mjs to warn about stale output.
 */
export async function sourceFiles(root) {
  const files = ['index.html', 'tsconfig.json'];
  const srcDir = resolve(root, 'src');
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(ts|css)$/.test(entry.name)) files.push(relative(root, full));
    }
  }
  await walk(srcDir);
  return files.sort();
}

export async function computeSourceHash(root) {
  const hash = createHash('sha256');
  for (const file of await sourceFiles(root)) {
    hash.update(file);
    hash.update('\0');
    hash.update(await readFile(resolve(root, file)));
    hash.update('\0');
  }
  return hash.digest('hex');
}
