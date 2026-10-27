/**
 * Real-browser QA for Branchwork.
 *
 * Starts the local server, drives the served application in Chromium, and
 * reports every assertion. Exits non-zero when anything fails, so a partial
 * run can never be mistaken for a pass.
 *
 *   npm run build && npm run qa
 *
 * Environment: Chromium needs its shared libraries installed. On Debian-like
 * images install them with `npx playwright install-deps chromium`.
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const PORT = Number(process.env.QA_PORT || 4181);
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = 'artifacts/qa';
const results = [];
let browser;
let server;

const check = async (name, fn) => {
  const startedAt = Date.now();
  try {
    await fn();
    const ms = Date.now() - startedAt;
    results.push({ name, ok: true, ms });
    console.log(`PASS  ${name} (${ms} ms)`);
  } catch (error) {
    const ms = Date.now() - startedAt;
    results.push({ name, ok: false, ms, detail: error instanceof Error ? error.message : String(error) });
    console.log(`FAIL  ${name} (${ms} ms)\n      ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
  }
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const equal = (actual, expected, message) => {
  if (actual !== expected) throw new Error(`${message} (expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)})`);
};

async function startServer() {
  server = spawn(process.env.NODE || 'node', ['server.mjs'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  server.stdout.on('data', (chunk) => (log += chunk));
  server.stderr.on('data', (chunk) => (log += chunk));
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`server exited: ${log.trim()}`);
    try {
      const response = await fetch(BASE, { redirect: 'manual' });
      if (response.ok) return;
    } catch {
      /* not listening yet */
    }
    await sleep(100);
  }
  throw new Error(`server did not become ready: ${log.trim()}`);
}

const watchConsole = (page, sink) => {
  page.on('console', (message) => {
    if (message.type() === 'error') sink.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => sink.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400) sink.push(`HTTP ${response.status()} ${response.url()}`);
  });
};

const diagnostics = (page) => page.evaluate(() => window.__branchworkDiagnostics());
const rowFor = (page, text) => page.locator('.record-table tbody tr').filter({ hasText: text }).first();
const openModalFor = async (page, action, id) => {
  await page.locator(`[data-action="${action}"][data-id="${id}"]`).first().click();
  await page.locator('.modal-card').waitFor({ state: 'visible' });
};
const submitModal = (page) => page.locator('.modal-form button[type="submit"]').click();
const formError = async (page) => {
  const error = page.locator('#form-error');
  await error.waitFor({ state: 'visible' });
  return (await error.textContent())?.trim() || '';
};
const gotoPage = async (page, name) => {
  const shell = (await page.viewportSize()).width > 1080;
  if (!shell) {
    await page.locator('.mobile-dock [data-action="mobile-toggle"]').click();
    await page.locator('#app-sidebar').waitFor({ state: 'visible' });
  }
  await page.locator(`#app-sidebar [data-page="${name}"]`).click();
  await page.waitForTimeout(60);
};
const overflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const axeSource = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
const axeScan = async (page) => {
  await page.evaluate(axeSource);
  const report = await page.evaluate(async () =>
    window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    }),
  );
  return report.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
    target: violation.nodes[0]?.target?.join(' '),
  }));
};

async function main() {
  await mkdir(SHOTS, { recursive: true });
  await startServer();
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(20000);
  const errors = [];
  watchConsole(page, errors);

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  // ---------------------------------------------------------------- shell
  await check('app loads from the compiled distribution without console errors', async () => {
    equal(await page.title(), 'Shift desk · Branchwork', 'document title');
    equal((await page.locator('h1').textContent())?.trim(), 'Shift desk', 'overview heading');
    assert((await page.locator('.sidebar').isVisible()), 'sidebar should be visible at 1440px');
    assert(!(await page.locator('.mobile-dock').isVisible()), 'mobile dock must stay hidden on desktop');
    assert(!(await page.locator('.menu-btn').isVisible()), 'menu button must stay hidden on desktop');
    assert(!(await page.locator('.sidebar-close').isVisible()), 'drawer close must stay hidden on desktop');
  });

  await check('every section renders its own heading and stays inside the viewport', async () => {
    const pages = [
      ['inventory', 'Inventory'],
      ['orders', 'Orders'],
      ['checklists', 'Checklists'],
      ['team', 'People & training'],
      ['insights', 'Insights'],
      ['overview', 'Shift desk'],
    ];
    for (const [name, heading] of pages) {
      await gotoPage(page, name);
      equal((await page.locator('h1').textContent())?.trim(), heading, `${name} heading`);
      equal(await overflow(page), 0, `${name} horizontal overflow at 1440px`);
    }
  });

  await check('desktop screenshots capture each section', async () => {
    for (const name of ['overview', 'inventory', 'orders', 'checklists', 'team', 'insights']) {
      await gotoPage(page, name);
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${SHOTS}/desktop-${name}.png`, fullPage: true });
    }
  });

  // ------------------------------------------------------------ inventory
  await gotoPage(page, 'inventory');
  const ingredientId = await page.locator('[data-action="move-stock"]').first().getAttribute('data-id');
  const storedQty = (id) =>
    page.evaluate(
      ({ key, ingredient }) =>
        JSON.parse(localStorage.getItem(key) || '{}').ingredients?.find((item) => item.id === ingredient)?.qty,
      { key: 'bigbrew-branchwork-v1', ingredient: id },
    );
  const summaryQty = async () => {
    const text = await page.locator('.modal-card .entity-summary span').first().textContent();
    const match = (text || '').match(/Current balance:\s*([\d.]+)/);
    assert(match, `could not read the current balance from: ${text}`);
    return Number(match[1]);
  };

  await check('receiving stock updates the balance and writes one ledger record', async () => {
    const movementsBefore = (await diagnostics(page)).storedMovements;
    await openModalFor(page, 'move-stock', ingredientId);
    const before = await summaryQty();
    await page.selectOption('select[name="action"]', 'receive');
    await page.fill('input[name="amount"]', '2.5');
    await page.fill('input[name="note"]', '=SUM(1,2) supplier delivery');
    await submitModal(page);
    await page.locator('.modal-card').waitFor({ state: 'detached' });
    const after = await storedQty(ingredientId);
    equal(after, Math.round((Number(before) + 2.5) * 100) / 100, 'balance after receipt');
    equal((await diagnostics(page)).storedMovements, movementsBefore + 1, 'one ledger record');
    const ledger = await page.locator('.ledger-list').textContent();
    assert(/supplier delivery/i.test(ledger || ''), 'ledger should show the receipt note');
  });

  await check('negative stock is refused with an inline error', async () => {
    await openModalFor(page, 'move-stock', ingredientId);
    await page.selectOption('select[name="action"]', 'consume');
    await page.fill('input[name="amount"]', '9999');
    await page.fill('input[name="note"]', 'Overdraw attempt');
    await submitModal(page);
    const message = await formError(page);
    assert(/Insufficient stock/.test(message), `expected an insufficient-stock message, received: ${message}`);
    await page.keyboard.press('Escape');
    await page.locator('.modal-card').waitFor({ state: 'detached' });
  });

  await check('a physical count replaces the balance and records the variance', async () => {
    await openModalFor(page, 'move-stock', ingredientId);
    const before = await summaryQty();
    await page.selectOption('select[name="action"]', 'count');
    await page.fill('input[name="amount"]', '12');
    await page.fill('input[name="note"]', 'Shift count');
    await submitModal(page);
    await page.locator('.modal-card').waitFor({ state: 'detached' });
    equal(await storedQty(ingredientId), 12, 'count sets the observed balance');
    assert(Number(before) !== 12, 'the test count differs from the previous balance');
    const ledger = await page.locator('.ledger-list').textContent();
    assert(/shift count/i.test(ledger || ''), 'ledger should show the count');
  });

  await check('low-stock filter narrows the table without breaking layout', async () => {
    await page.locator('[data-action="set-filter"][data-filter="low"]').click();
    await page.waitForTimeout(80);
    const rows = await page.locator('.record-table tbody tr').count();
    assert(rows >= 1 && rows < 6, `expected a narrowed list, received ${rows} rows`);
    await page.locator('[data-action="set-filter"][data-filter="all"]').click();
  });

  // ---------------------------------------------------------------- orders
  await gotoPage(page, 'orders');
  const latestOrder = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('bigbrew-branchwork-v1')).orders[0]);
  const orderCard = async () => page.locator(`#order-${(await latestOrder()).id}`);
  // Sample staff ids are stable: st-a Alex Rivera, st-b Sam Cruz.
  const asActor = async (id) => {
    await page.selectOption('#operator', id);
    await page.waitForTimeout(100);
  };

  await check('a multi-item order keeps both lines and refuses a self-check', async () => {
    await page.locator('[data-action="new-order"]').first().click();
    await page.locator('.modal-card').waitFor({ state: 'visible' });
    await page.fill('input[name="drink[]"]', 'Milk tea');
    await page.fill('input[name="qty[]"]', '2');
    await page.fill('input[name="details[]"]', 'With pearls');
    await page.locator('[data-action="add-order-line"]').click();
    const second = page.locator('.line-fields').nth(1);
    await second.locator('input[name="drink[]"]').fill('Coffee');
    await second.locator('input[name="qty[]"]').fill('1');
    await second.locator('input[name="details[]"]').fill('Less ice');
    await submitModal(page);
    await page.locator('.modal-card').waitFor({ state: 'detached' });
    const created = await latestOrder();
    equal(created.status, 'queued', 'new order status');
    equal(created.lines.length, 2, 'multi-item order keeps both lines');
    equal(created.lines[0].qty, 2, 'line quantity');
    await (await orderCard()).locator('[data-action="prepare-order"]').click();
    await page.waitForTimeout(120);
    equal((await latestOrder()).status, 'verification', 'prepared order awaits a check');
    const card = await orderCard();
    equal(await card.locator('[data-action="verify-order"]').count(), 0, 'a self-check is never offered');
    const checker = card.locator('[data-action="focus-operator"]');
    assert((await checker.count()) > 0, 'the card should offer a checker change instead');
    assert(/Change checker/.test(await checker.textContent()), 'the affordance names the next step');
  });

  await check('a second employee completes the verification', async () => {
    await asActor('st-b');
    await (await orderCard()).locator('[data-action="verify-order"]').click();
    await page.locator('.modal-card').waitFor({ state: 'visible' });
    for (let index = 0; index < 4; index += 1) {
      await page.locator(`input[name="check-${index}"]`).check({ force: true });
    }
    await page.selectOption('select[name="result"]', 'pass');
    await submitModal(page);
    await page.locator('.modal-card').waitFor({ state: 'detached' });
    const order = await latestOrder();
    equal(order.status, 'completed', 'verified order is completed');
    equal(order.verifications.length, 1, 'one verification record');
    equal(order.verifications[0].passed, true, 'the check passed');
    equal(order.preparedBy !== order.verifications[0].actorId, true, 'checker differs from preparer');
  });

  await check('a failed check needs an issue and returns the order for correction', async () => {
    await page.locator('[data-action="new-order"]').first().click();
    await page.locator('.modal-card').waitFor({ state: 'visible' });
    await page.fill('input[name="drink[]"]', 'Fruit tea');
    await page.fill('input[name="qty[]"]', '1');
    await submitModal(page);
    await page.locator('.modal-card').waitFor({ state: 'detached' });
    const created = await latestOrder();
    await (await orderCard()).locator('[data-action="prepare-order"]').click();
    await page.waitForTimeout(120);
    await asActor('st-a');
    await (await orderCard()).locator('[data-action="verify-order"]').click();
    await page.locator('.modal-card').waitFor({ state: 'visible' });
    await page.selectOption('select[name="result"]', 'fail');
    await submitModal(page);
    const issueError = await formError(page);
    assert(/issue category/i.test(issueError), `failed check needs a category: ${issueError}`);
    await page.selectOption('select[name="issue"]', 'Missing topping');
    await page.fill('textarea[name="notes"]', 'No pearls in the cup');
    await submitModal(page);
    await page.locator('.modal-card').waitFor({ state: 'detached' });
    const failed = await latestOrder();
    equal(failed.id, created.id, 'same order');
    equal(failed.status, 'needs-fix', 'failed check returns the order for correction');
    const correction = page.locator(`#order-${failed.id} .correction-note`);
    assert((await correction.count()) > 0, 'the correction reason should be visible on the card');
    assert(/Missing topping/.test(await correction.textContent()), 'issue category on the card');
  });

  await check('a corrected order passes on re-verification and keeps the failure history', async () => {
    const failed = await latestOrder();
    await (await orderCard()).locator('[data-action="prepare-order"]').click();
    await page.waitForTimeout(120);
    await asActor('st-b');
    await (await orderCard()).locator('[data-action="verify-order"]').click();
    await page.locator('.modal-card').waitFor({ state: 'visible' });
    for (let index = 0; index < 4; index += 1) {
      await page.locator(`input[name="check-${index}"]`).check({ force: true });
    }
    await page.selectOption('select[name="result"]', 'pass');
    await submitModal(page);
    await page.locator('.modal-card').waitFor({ state: 'detached' });
    const order = await latestOrder();
    equal(order.id, failed.id, 'same order after correction');
    equal(order.status, 'completed', 'corrected order completes');
    equal(order.verifications.length, 2, 'both checks stay on the record');
    equal(order.verifications[0].passed, false, 'the failed check is preserved');
  });

  await check('cancelling an order requires a reason and keeps the record', async () => {
    await asActor('st-a');
    await page.locator('[data-action="new-order"]').first().click();
    await page.locator('.modal-card').waitFor({ state: 'visible' });
    await page.fill('input[name="drink[]"]', 'Iced coffee');
    await submitModal(page);
    await page.locator('.modal-card').waitFor({ state: 'detached' });
    const created = await latestOrder();
    await (await orderCard()).locator('[data-action="view-order"]').first().click();
    await page.locator('.modal-card').waitFor({ state: 'visible' });
    await page.locator('[data-action="cancel-prompt"]').click();
    await page.locator('textarea[name="reason"]').waitFor({ state: 'visible' });
    await submitModal(page);
    const reasonError = await formError(page);
    assert(/required/i.test(reasonError), `cancellation needs a reason: ${reasonError}`);
    await page.fill('textarea[name="reason"]', 'Customer left the counter');
    await submitModal(page);
    await page.locator('.modal-card').waitFor({ state: 'detached' });
    const cancelled = await page.evaluate(
      (id) => JSON.parse(localStorage.getItem('bigbrew-branchwork-v1')).orders.find((order) => order.id === id),
      created.id,
    );
    equal(cancelled.status, 'cancelled', 'cancelled order status');
    equal(cancelled.cancelReason, 'Customer left the counter', 'cancellation reason stored');
    assert((await page.locator(`#order-${created.id}`).count()) > 0, 'cancelled order remains in the local record');
  });

  await check('order filters and search narrow the list', async () => {
    await page.locator('[data-action="set-filter"][data-filter="open"]').click();
    await page.waitForTimeout(120);
    const openRows = await page.locator('.order-card').count();
    const total = (await diagnostics(page)).orders;
    assert(openRows > 0 && openRows < total, `open filter should narrow ${total} orders, received ${openRows}`);
    await page.fill('#page-search', 'BB-1001');
    await page.waitForTimeout(150);
    const searchRows = await page.locator('.order-card').count();
    assert(searchRows <= openRows, 'search should not widen the filtered list');
    await page.locator('[data-action="clear-search"]').first().click();
    await page.locator('[data-action="set-filter"][data-filter="all"]').click();
    await page.waitForTimeout(120);
    equal(await page.locator('.order-card').count(), total, 'clearing the filter restores every order');
  });

  // ------------------------------------------------------------ checklists
  await gotoPage(page, 'checklists');
  await check('a checklist is completed step by step and signed off', async () => {
    await page.locator('[data-action="start-checklist"][data-kind="Opening"]').click();
    await page.locator('.modal-card, .run-card').first().waitFor();
    const boxes = page.locator('input[data-check]');
    const total = await boxes.count();
    assert(total >= 4, `expected the opening checklist steps, received ${total}`);
    const signoff = page.locator('[data-action="complete-checklist"]');
    assert(await signoff.isDisabled(), 'sign-off must stay disabled until every step is ticked');
    for (let index = 0; index < total; index += 1) await boxes.nth(index).check({ force: true });
    await page.waitForTimeout(80);
    assert(!(await signoff.isDisabled()), 'sign-off should enable once every step is ticked');
    await signoff.click();
    await page.waitForTimeout(120);
    const completed = page.locator('.completion-list');
    assert((await completed.count()) > 0, 'signed-off routine should appear in the completed list');
    assert(/Opening/.test(await completed.textContent()), 'the signed-off Opening routine is listed');
    const signed = await page.evaluate(
      () => JSON.parse(localStorage.getItem('bigbrew-branchwork-v1')).checklists.filter((run) => run.completedAt).length,
    );
    equal(signed, 1, 'one signed-off routine is stored');
  });

  // ---------------------------------------------------------------- people
  await gotoPage(page, 'team');
  await check('an employee is added, edited, and can be deactivated', async () => {
    await page.locator('[data-action="add-employee"]').first().click();
    await page.locator('.modal-card').waitFor({ state: 'visible' });
    await page.fill('input[name="name"]', 'Nina Reyes');
    await page.selectOption('select[name="role"]', 'Supervisor');
    await submitModal(page);
    await page.locator('.modal-card').waitFor({ state: 'detached' });
    const row = page.locator('.record-table tbody tr, .person-row').filter({ hasText: 'Nina Reyes' }).first();
    assert((await row.count()) > 0, 'new employee should appear in the directory');
    await row.locator('[data-action="edit-employee"]').click();
    await page.locator('.modal-card').waitFor({ state: 'visible' });
    await page.fill('input[name="name"]', 'Nina Reyes-Alba');
    await page.selectOption('select[name="active"]', 'no');
    await submitModal(page);
    await page.locator('.modal-card').waitFor({ state: 'detached' });
    const edited = page.locator('.record-table tbody tr, .person-row').filter({ hasText: 'Nina Reyes-Alba' }).first();
    assert((await edited.textContent()).includes('Inactive'), 'edited employee should be marked inactive');
  });

  await check('training can be assigned and completed', async () => {
    const before = (await diagnostics(page)).trainings;
    await page.locator('[data-action="assign-training"]').first().click();
    await page.locator('.modal-card').waitFor({ state: 'visible' });
    await page.selectOption('select[name="moduleId"]', 'inventory');
    await submitModal(page);
    await page.locator('.modal-card').waitFor({ state: 'detached' });
    equal((await diagnostics(page)).trainings, before + 1, 'one assignment is stored');
    const assignment = await page.evaluate(
      () => JSON.parse(localStorage.getItem('bigbrew-branchwork-v1')).trainings[0],
    );
    const row = page.locator(`#training-${assignment.id}`);
    assert((await row.count()) > 0, 'assignment should be listed');
    assert(/Open/.test(await row.textContent()), 'assignment starts open');
    await row.locator('[data-action="complete-training"]').click();
    await page.waitForTimeout(150);
    const updated = page.locator(`#training-${assignment.id}`);
    assert(/Completed/.test(await updated.textContent()), 'assignment is marked complete');
    equal(await updated.locator('[data-action="complete-training"]').count(), 0, 'no completion action remains');
    assert(/Completed [A-Z][a-z]{2} \d/.test(await updated.textContent()), 'completion date is shown');
  });

  // --------------------------------------------------------------- exports
  await check('JSON backup and CSV exports download with sanitized cells', async () => {
    await gotoPage(page, 'insights');
    const json = await Promise.all([page.waitForEvent('download'), page.locator('[data-action="export-json"]').click()]);
    equal(json[0].suggestedFilename(), 'branchwork-backup.json', 'JSON filename');
    const jsonPath = await json[0].path();
    const payload = JSON.parse(await readFile(jsonPath, 'utf8'));
    equal(payload.version, 1, 'exported schema version');

    const stock = await Promise.all([page.waitForEvent('download'), page.locator('[data-action="export-stock"]').click()]);
    equal(stock[0].suggestedFilename(), 'branchwork-stock-ledger.csv', 'stock CSV filename');
    const stockCsv = await readFile(await stock[0].path(), 'utf8');
    assert(stockCsv.startsWith('"Date","Ingredient"'), 'stock CSV header');
    assert(stockCsv.includes(`"'=SUM(1,2) supplier delivery"`), 'formula-like note must be neutralised');

    const orders = await Promise.all([page.waitForEvent('download'), page.locator('[data-action="export-orders"]').click()]);
    equal(orders[0].suggestedFilename(), 'branchwork-orders.csv', 'orders CSV filename');
    const ordersCsv = await readFile(await orders[0].path(), 'utf8');
    assert(ordersCsv.startsWith('"Order code","Created"'), 'orders CSV header');
    assert(ordersCsv.includes('Customer left the counter'), 'cancellation reason is exported');
  });

  await check('payback scenario recalculates from saved assumptions', async () => {
    await page.fill('input[name="setup"]', '1000');
    await page.fill('input[name="training"]', '500');
    await page.fill('input[name="monthlyTool"]', '200');
    await page.fill('input[name="wasteSavings"]', '600');
    await page.fill('input[name="refundSavings"]', '200');
    await page.fill('input[name="addedMargin"]', '100');
    await page.locator('#save-scenario').click();
    await page.waitForTimeout(120);
    const output = await page.locator('.scenario-payback dd').textContent();
    assert(/2\.14 months/.test(output || ''), `expected a 2.14 month payback, received: ${output}`);
    await page.reload({ waitUntil: 'networkidle' });
    await gotoPage(page, 'insights');
    const persisted = await page.locator('.scenario-payback dd').textContent();
    assert(/2\.14 months/.test(persisted || ''), 'scenario assumptions should survive a reload');
  });

  // ----------------------------------------------------------- persistence
  await check('records persist across a reload through the existing storage key', async () => {
    const before = await diagnostics(page);
    await page.reload({ waitUntil: 'networkidle' });
    const after = await diagnostics(page);
    equal(after.orders, before.orders, 'order count after reload');
    equal(after.ingredients, before.ingredients, 'ingredient count after reload');
    const stored = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || '{}').mode,
      'bigbrew-branchwork-v1',
    );
    equal(stored, 'sample', 'storage key preserved');
  });

  // ------------------------------------------------------------ viewports
  const viewports = [320, 360, 390, 430, 768, 1024, 1440, 1920];
  await check('no page overflows horizontally at any tested viewport', async () => {
    const context2 = await browser.newContext({ acceptDownloads: true });
    const mobile = await context2.newPage();
    mobile.setDefaultTimeout(8000);
    const localErrors = [];
    watchConsole(mobile, localErrors);
    await mobile.goto(BASE, { waitUntil: 'networkidle' });
    for (const width of viewports) {
      await mobile.setViewportSize({ width, height: 900 });
      for (const name of ['overview', 'inventory', 'orders', 'checklists', 'team', 'insights']) {
        await gotoPage(mobile, name);
        const delta = await overflow(mobile);
        assert(delta <= 0, `${name} overflows by ${delta}px at ${width}px`);
      }
    }
    assert(localErrors.length === 0, `console errors: ${localErrors.join(' | ')}`);
    await context2.close();
  });

  await check('mobile layout keeps the dock, hides the desktop rail, and keeps 44px targets', async () => {
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobile = await mobileContext.newPage();
    mobile.setDefaultTimeout(8000);
    await mobile.goto(BASE, { waitUntil: 'networkidle' });
    assert(await mobile.locator('.mobile-dock').isVisible(), 'dock visible at 390px');
    const rail = await mobile.locator('#app-sidebar').boundingBox();
    assert(rail && rail.x + rail.width <= 1, `rail should start off-canvas, received ${JSON.stringify(rail)}`);
    assert(await mobile.locator('.menu-btn').isVisible(), 'menu button visible at 390px');
    const sizes = await mobile.locator('.dock-link').evaluateAll((links) =>
      links.map((link) => {
        const box = link.getBoundingClientRect();
        return { w: Math.round(box.width), h: Math.round(box.height) };
      }),
    );
    for (const size of sizes) {
      assert(size.w >= 44 && size.h >= 44, `dock target too small: ${size.w}x${size.h}`);
    }
    const bodySize = await mobile.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.page-lede') || document.body).fontSize));
    assert(bodySize >= 15, `mobile body copy should stay readable, received ${bodySize}px`);
    await mobile.waitForTimeout(200);
    await mobile.screenshot({ path: `${SHOTS}/mobile-overview.png`, fullPage: true });
    await mobile.locator('.record-table tbody tr, .order-row').first().waitFor({ state: 'visible' }).catch(() => {});
    await gotoPage(mobile, 'inventory');
    await mobile.screenshot({ path: `${SHOTS}/mobile-inventory.png`, fullPage: true });
    for (const width of [320, 360, 390]) {
      await mobile.setViewportSize({ width, height: 844 });
      await mobile.waitForTimeout(120);
      await mobile.locator('[data-action="move-stock"]').first().click();
      await mobile.locator('.modal-card').waitFor({ state: 'visible' });
      await mobile.waitForTimeout(260);
      const fits = await mobile.evaluate(() => {
        const card = document.querySelector('.modal-card').getBoundingClientRect();
        return {
          top: Math.round(card.top),
          bottom: Math.round(card.bottom),
          width: Math.round(card.width),
          viewport: window.innerWidth,
          inner: document.querySelector('.modal-card').scrollHeight <= document.querySelector('.modal-card').clientHeight + 1,
        };
      });
      assert(fits.width <= fits.viewport, `dialog must fit ${width}px, received ${fits.width}`);
      assert(fits.top >= 0, `dialog must not start above the viewport at ${width}px`);
      assert(fits.bottom <= 845, `dialog must not run past the viewport at ${width}px, bottom ${fits.bottom}`);
      if (width === 390) await mobile.screenshot({ path: `${SHOTS}/mobile-dialog.png` });
      await mobile.keyboard.press('Escape');
      await mobile.locator('.modal-card').waitFor({ state: 'detached' });
    }
    await mobileContext.close();
  });

  // ------------------------------------------------------------- keyboard
  await check('Escape closes the dialog and returns focus to its trigger', async () => {
    await gotoPage(page, 'inventory');
    const trigger = page.locator('[data-action="history-stock"]').first();
    await trigger.focus();
    await trigger.click();
    await page.locator('.modal-card').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await page.locator('.modal-card').waitFor({ state: 'detached' });
    const returned = await page.evaluate(() => document.activeElement?.getAttribute('data-action'));
    equal(returned, 'history-stock', 'focus should return to the trigger');
  });

  await check('dialog traps Tab and keeps focus inside', async () => {
    await page.locator('[data-action="history-stock"]').first().click();
    await page.locator('.modal-card').waitFor({ state: 'visible' });
    const inside = await page.evaluate(() => document.querySelector('.modal-card')?.contains(document.activeElement));
    assert(inside === true, 'focus should move inside the dialog');
    for (let index = 0; index < 24; index += 1) {
      await page.keyboard.press('Tab');
      const stillInside = await page.evaluate(() => document.querySelector('.modal-card')?.contains(document.activeElement));
      assert(stillInside === true, 'Tab must stay inside the dialog');
    }
    await page.keyboard.press('Escape');
    await page.locator('.modal-card').waitFor({ state: 'detached' });
  });

  await check('mobile drawer opens, traps focus, and closes with Escape', async () => {
    const mobile = await context.newPage();
    mobile.setDefaultTimeout(8000);
    await mobile.setViewportSize({ width: 390, height: 844 });
    await mobile.goto(BASE, { waitUntil: 'networkidle' });
    await mobile.locator('.menu-btn').click();
    await mobile.waitForTimeout(220);
    const openState = await mobile.evaluate(() => document.querySelector('#app-sidebar')?.classList.contains('is-open'));
    assert(openState === true, 'drawer should open');
    for (let index = 0; index < 10; index += 1) await mobile.keyboard.press('Tab');
    const trapped = await mobile.evaluate(() => document.querySelector('#app-sidebar')?.contains(document.activeElement));
    assert(trapped === true, 'focus should stay inside the open drawer');
    await mobile.keyboard.press('Escape');
    await mobile.waitForTimeout(220);
    const closed = await mobile.evaluate(() => !document.querySelector('#app-sidebar')?.classList.contains('is-open'));
    assert(closed === true, 'Escape should close the drawer');
    await mobile.close();
  });

  // --------------------------------------------------------- reduced motion
  await check('reduced-motion keeps feedback but removes movement', async () => {
    const calm = await context.newPage();
    calm.setDefaultTimeout(8000);
    await calm.emulateMedia({ reducedMotion: 'reduce' });
    await calm.goto(BASE, { waitUntil: 'networkidle' });
    const surfaces = await calm.evaluate(() =>
      ['.sidebar', '.toast', '.btn', '.modal-card', '.mobile-dock', '.progress > span', '.nav-link']
        .map((selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const style = getComputedStyle(el);
          return {
            selector,
            max: Math.max(
              ...`${style.transitionDuration},${style.animationDuration}`
                .split(',')
                .map((value) => parseFloat(value) || 0),
            ),
            moving: style.transitionProperty
              .split(',')
              .map((value) => value.trim())
              .filter((value) => ['transform', 'width', 'height', 'top', 'left', 'margin', 'padding'].includes(value)),
          };
        })
        .filter(Boolean),
    );
    for (const surface of surfaces) {
      assert(surface.max <= 0.16, `${surface.selector} still animates for ${surface.max}s under reduced motion`);
      assert(surface.moving.length === 0, `${surface.selector} still transitions ${surface.moving.join(', ')} under reduced motion`);
    }
    await calm.close();
  });

  // ---------------------------------------------------- interaction states
  await check('the states layer is themed: caret, scrollbar, press, disabled, progress', async () => {
    const styled = await context.newPage();
    styled.setDefaultTimeout(8000);
    await styled.goto(BASE, { waitUntil: 'networkidle' });
    const tokens = await styled.evaluate(() => {
      const field = document.querySelector('.field input, #page-search');
      const fill = document.querySelector('.progress > span');
      const signoff = document.querySelector('.btn:disabled') || document.querySelector('button:disabled');
      const rules = [];
      for (const sheet of Array.from(document.styleSheets)) {
        for (const rule of Array.from(sheet.cssRules || [])) rules.push(rule.cssText || '');
      }
      return {
        caret: field ? getComputedStyle(field).caretColor : '',
        scrollbar: getComputedStyle(document.documentElement).scrollbarColor,
        fillTransition: fill ? getComputedStyle(fill).transitionProperty : '',
        fillTransform: fill ? getComputedStyle(fill).transform : '',
        disabledCursor: signoff ? getComputedStyle(signoff).cursor : '',
        disabledOpacity: signoff ? getComputedStyle(signoff).opacity : '',
        transitionAll: rules.filter((rule) => /transition(-property)?:\s*all\b/.test(rule)),
      };
    });
    assert(tokens.caret && tokens.caret !== 'rgb(0, 0, 0)', `caret follows the accent, received ${tokens.caret}`);
    assert(/rgb/.test(tokens.scrollbar), `scrollbar should be themed, received ${tokens.scrollbar}`);
    assert(tokens.fillTransition.includes('transform'), `progress fill should animate transform, received ${tokens.fillTransition}`);
    assert(!tokens.fillTransition.includes('width'), `progress fill must not animate layout width, received ${tokens.fillTransition}`);
    assert(tokens.fillTransform !== 'none', 'progress fill should carry a --fill scale');
    if (tokens.disabledCursor) equal(tokens.disabledCursor, 'not-allowed', 'disabled cursor');
    if (tokens.disabledOpacity) assert(parseFloat(tokens.disabledOpacity) >= 0.9, `disabled text should stay readable, received opacity ${tokens.disabledOpacity}`);
    assert(tokens.transitionAll.length === 0, `transition: all found in ${tokens.transitionAll.length} rule(s)`);

    // Press receipt: pointer-down changes the control before release.
    const nav = styled.locator('.nav-link').nth(1);
    const before = await nav.evaluate((el) => getComputedStyle(el).backgroundColor);
    const box = await nav.boundingBox();
    assert(box, 'nav link should have a box');
    await styled.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await styled.mouse.down();
    await styled.waitForTimeout(60);
    const pressed = await nav.evaluate((el) => getComputedStyle(el).backgroundColor);
    await styled.mouse.up();
    assert(pressed !== before, `pointer-down should change the control (before ${before}, pressed ${pressed})`);
    await styled.close();
  });

  // -------------------------------------------------------- accessibility
  await check('axe reports no serious or critical violations on any section', async () => {
    const audit = await context.newPage();
    audit.setDefaultTimeout(8000);
    await audit.goto(BASE, { waitUntil: 'networkidle' });
    const found = [];
    for (const name of ['overview', 'inventory', 'orders', 'checklists', 'team', 'insights']) {
      await gotoPage(audit, name);
      const violations = await axeScan(audit);
      for (const violation of violations) {
        found.push(`${name}: ${violation.id} (${violation.impact}) ${violation.nodes} node(s) at ${violation.target}`);
      }
    }
    await audit.close();
    assert(found.length === 0, found.join(' | '));
  });

  await check('the served page has no console or network errors after the full flow', async () => {
    assert(errors.length === 0, errors.join(' | '));
  });

  await context.close();
}

try {
  await main();
} catch (error) {
  results.push({ name: 'suite bootstrap', ok: false, detail: error instanceof Error ? error.stack || error.message : String(error) });
} finally {
  await browser?.close();
  server?.kill();
}

const failed = results.filter((result) => !result.ok);
for (const result of results) {
  if (!result.ok) console.log(`FAIL  ${result.name}\n      ${result.detail}`);
}
await writeFile(
  'artifacts/qa/results.txt',
  `${results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n  ${r.detail}`}`).join('\n')}\n`,
);
console.log(`\n${results.length - failed.length}/${results.length} browser checks passed`);
process.exit(failed.length ? 1 : 0);
