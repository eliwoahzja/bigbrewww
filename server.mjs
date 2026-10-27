import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { computeSourceHash } from './scripts/source-hash.mjs';
import { liveConfigHandler, liveStateHandler } from './server/workspace.mjs';

const base = process.cwd();
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};
const security = {
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

const exists = async (path) => {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
};

const missing = [];
for (const file of ['index.html', 'src/styles.css', 'dist/main.js', 'assets/bigbrew-mark.png']) {
  if (!(await exists(resolve(base, file)))) missing.push(file);
}
if (missing.length) {
  console.error(`\nBranchwork cannot start: missing ${missing.join(', ')}.\n`);
  console.error('Run "npm install && npm run build" in this folder, then "npm start".');
  process.exit(1);
}

try {
  const info = JSON.parse(await readFile(resolve(base, 'dist/build-info.json'), 'utf8'));
  const current = await computeSourceHash(base);
  if (info.sourceHash !== current) {
    console.warn('Warning: compiled files may be stale. Run "npm run build" to refresh dist/.');
  }
} catch {
  console.warn('Warning: no build metadata found. Run "npm run build" to verify compiled output.');
}

const apiRoutes = new Map([
  ['/api/config', liveConfigHandler],
  ['/api/state', liveStateHandler],
]);

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    const api = apiRoutes.get(url.pathname);
    if (api) {
      if (req.method === 'OPTIONS') {
        res.writeHead(405, { ...security, Allow: 'GET, PUT' });
        res.end();
        return;
      }
      await api(req, res);
      return;
    }

    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = resolve(base, `.${pathname}`);
    if (!(file === base || file.startsWith(`${base}${sep}`))) {
      res.writeHead(403, { ...security, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    const headers = {
      ...security,
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { ...security, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(port, () => {
  console.log(`Branchwork local workspace: http://localhost:${port}`);
  console.log(
    process.env.DATABASE_URL && process.env.BRANCHWORK_ACCESS_KEY
      ? 'Live storage: Postgres branch workspace enabled.'
      : 'Live storage: not configured — serving the offline workspace.',
  );
});
