import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeSourceHash, sourceFiles } from './source-hash.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const publicDir = join(root, 'public');

const fail = (message) => {
  console.error(`\nBuild failed: ${message}`);
  process.exit(1);
};

const exists = async (file) => {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
};

const sources = await sourceFiles(root);
const expectedModules = sources
  .filter((file) => file.startsWith('src/') && file.endsWith('.ts'))
  .map((file) => file.replace(/^src\//, '').replace(/\.ts$/, '.js'));

await mkdir(dist, { recursive: true });
const emitted = (await readdir(dist)).filter((name) => name.endsWith('.js'));
for (const name of emitted) {
  if (!expectedModules.includes(name)) await rm(join(dist, name));
}

for (const name of expectedModules) {
  if (!(await exists(join(dist, name)))) {
    fail(`TypeScript did not emit dist/${name}. Run "npm run build" from a clean checkout.`);
  }
}

// Verify that every relative module import in the built output resolves.
for (const name of expectedModules) {
  const code = await readFile(join(dist, name), 'utf8');
  for (const match of code.matchAll(/(?:from|import)\s*['"](\.[^'"]+)['"]/g)) {
    const target = resolve(dist, match[1]);
    if (!(await exists(target))) fail(`dist/${name} imports missing module ${match[1]}`);
  }
}

const indexHtml = await readFile(join(root, 'index.html'), 'utf8');
const references = [...indexHtml.matchAll(/(?:href|src)="\/([^"#?]+)"/g)].map((match) => match[1]);
const required = ['dist/main.js', 'src/styles.css', 'assets/favicon.png'];
for (const reference of required) {
  if (!references.includes(reference)) fail(`index.html must reference /${reference}`);
}
for (const asset of ['assets/bigbrew-mark.png', 'assets/favicon.png']) {
  if (!(await exists(join(root, asset)))) fail(`Missing ${asset}`);
}
for (const reference of references) {
  if (!(await exists(join(root, reference)))) fail(`index.html references missing file /${reference}`);
}

// public/ is a disposable deployment artifact. Rebuild it from scratch so stale
// styles or modules can never survive a build.
await rm(publicDir, { recursive: true, force: true });
await mkdir(join(publicDir, 'dist'), { recursive: true });
await mkdir(join(publicDir, 'src'), { recursive: true });
await cp(join(root, 'index.html'), join(publicDir, 'index.html'));
await cp(join(root, 'src/styles.css'), join(publicDir, 'src/styles.css'));
await cp(join(root, 'assets'), join(publicDir, 'assets'), { recursive: true });
for (const name of expectedModules) {
  await cp(join(dist, name), join(publicDir, 'dist', name));
}

const sourceHash = await computeSourceHash(root);
await writeFile(
  join(dist, 'build-info.json'),
  `${JSON.stringify({ schema: 1, sourceHash, modules: expectedModules }, null, 2)}\n`,
);

console.log(`Built ${expectedModules.length} ES modules into dist/ and public/.`);
console.log(`Source hash ${sourceHash.slice(0, 12)}…`);
