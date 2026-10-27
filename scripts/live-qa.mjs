/**
 * Live-workspace browser check.
 *
 * Runs the real server against a temporary local workspace store (the same
 * file repository the API tests use) so the unlock gate, write-through saves,
 * reload persistence, and cross-device sharing can be verified without a
 * hosted Postgres instance. Production uses Neon; this only proves the client
 * and API contract around it.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const PORT = Number(process.env.LIVE_QA_PORT || 4189);
const BASE = `http://127.0.0.1:${PORT}`;
const KEY = 'branch-check-key';
const results = [];
let browser;
let server;
let dir;

const check = async (name, fn) => {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name} (${Date.now() - started} ms)`);
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
    results.push({ name, ok: false, detail: message });
    console.log(`FAIL  ${name} (${Date.now() - started} ms)\n      ${message}`);
  }
};
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
const equal = (actual, expected, message) => {
  if (actual !== expected) throw new Error(`${message} (expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)})`);
};

async function start() {
  dir = await mkdtemp(join(tmpdir(), 'branchwork-live-'));
  server = spawn(process.execPath, ['server.mjs'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'development',
      BRANCHWORK_LOCAL_STORE: join(dir, 'workspace.json'),
      BRANCHWORK_ACCESS_KEY: KEY,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  server.stdout.on('data', (chunk) => (log += chunk));
  server.stderr.on('data', (chunk) => (log += chunk));
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`server exited: ${log}`);
    try {
      const response = await fetch(`${BASE}/api/config`);
      if (response.ok) return;
    } catch {
      /* not listening yet */
    }
    await sleep(100);
  }
  throw new Error(`server did not start: ${log}`);
}

async function main() {
  await start();
  browser = await chromium.launch();

  const first = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await first.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await check('a live workspace opens locked and renders no records', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.locator('#gate-form').waitFor({ state: 'visible' });
    equal((await page.locator('h1').textContent())?.trim(), 'Unlock the branch workspace', 'gate heading');
    equal(await page.locator('.sidebar').count(), 0, 'no app shell before unlock');
    equal(await page.locator('.brand').count(), 0, 'no workspace chrome before unlock');
  });

  await check('a wrong access key is refused without showing data', async () => {
    await page.fill('input[name="key"]', 'wrong-key');
    await page.locator('#gate-form button[type="submit"]').click();
    await page.locator('#gate-form .form-error').waitFor({ state: 'visible' });
    assert(/access key/i.test(await page.locator('#gate-form').textContent()), 'gate should explain the rejection');
    equal(await page.locator('.sidebar').count(), 0, 'still locked');
  });

  await check('the correct key loads a real empty workspace, not demo records', async () => {
    await page.fill('input[name="key"]', KEY);
    await page.locator('#gate-form button[type="submit"]').click();
    await page.locator('#app-sidebar').waitFor({ state: 'visible' });
    equal((await page.locator('h1').textContent())?.trim(), 'Shift desk', 'workspace heading');
    const diagnostics = await page.evaluate(() => window.__branchworkDiagnostics());
    equal(diagnostics.mode, 'live', 'workspace mode');
    equal(diagnostics.orders, 0, 'no sample orders');
    equal(diagnostics.employees, 0, 'no sample employees');
    equal(diagnostics.ingredients, 0, 'no sample ingredients');
    assert(/live branch workspace/i.test(await page.locator('.sidebar-note').textContent()), 'live status is labelled');
  });

  // A rejected key legitimately produces a 401 in the network log; from here on
  // the session is authenticated, so any error is a real defect.
  errors.length = 0;

  await check('the first real employee is written to the database', async () => {
    await page.locator('[data-action="add-employee"]').first().click();
    await page.locator('.modal-card').waitFor({ state: 'visible' });
    await page.fill('input[name="name"]', 'Mika Dela Cruz');
    await page.selectOption('select[name="role"]', 'Supervisor');
    await page.locator('.modal-form button[type="submit"]').click();
    await page.locator('.modal-card').waitFor({ state: 'detached' });
    await page.waitForTimeout(400);
    const stored = await page.evaluate(() => window.__branchworkDiagnostics());
    equal(stored.employees, 1, 'employee count after save');
    assert(stored.revision >= 2, `revision should advance, received ${stored.revision}`);
  });

  await check('reloading reads the same live record back', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#app-sidebar').waitFor({ state: 'visible' });
    await page.locator('[data-page="team"]').first().click();
    await page.locator('.record-table tbody tr').first().waitFor({ state: 'visible' });
    assert(/Mika Dela Cruz/.test(await page.locator('body').textContent()), 'the saved employee survives a reload');
  });

  await check('a second device sees the same branch workspace', async () => {
    const second = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const other = await second.newPage();
    other.setDefaultTimeout(8000);
    await other.goto(BASE, { waitUntil: 'networkidle' });
    await other.locator('#gate-form').waitFor({ state: 'visible' });
    await other.fill('input[name="key"]', KEY);
    await other.locator('#gate-form button[type="submit"]').click();
    await other.locator('#app-sidebar').waitFor({ state: 'visible' });
    await other.locator('[data-page="team"]').first().click();
    await other.locator('.record-table tbody tr').first().waitFor({ state: 'visible' });
    assert(/Mika Dela Cruz/.test(await other.locator('body').textContent()), 'second device reads the shared record');
    await second.close();
  });

  await check('the live session produced no console or page errors', async () => {
    assert(errors.length === 0, errors.join(' | '));
    await first.close();
  });
}

try {
  await main();
} catch (error) {
  results.push({ name: 'live suite bootstrap', ok: false, detail: error instanceof Error ? error.stack || error.message : String(error) });
} finally {
  await browser?.close();
  server?.kill();
  if (dir) await rm(dir, { recursive: true, force: true });
}

const failed = results.filter((result) => !result.ok);
for (const result of results) {
  if (!result.ok) console.log(`FAIL  ${result.name}\n      ${result.detail}`);
}
console.log(`\n${results.length - failed.length}/${results.length} live-workspace checks passed`);
process.exit(failed.length ? 1 : 0);
