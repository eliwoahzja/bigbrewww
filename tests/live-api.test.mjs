import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createConfigHandler,
  createStateHandler,
  emptyWorkspace,
  fileRepository,
  isDatabase,
} from '../server/workspace.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const KEY = 'branch-test-key';

function memoryRepository() {
  let row = null;
  return {
    async read() {
      return row ? { ...row } : null;
    },
    async create(_id, data) {
      if (row) return null;
      row = { revision: 1, data, updated_at: new Date().toISOString() };
      return { ...row };
    },
    async update(_id, expected, data) {
      if (!row || row.revision !== expected) return null;
      row = { revision: row.revision + 1, data, updated_at: new Date().toISOString() };
      return { ...row };
    },
  };
}

function mockResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(chunk = '') {
      this.body = String(chunk);
    },
    json() {
      return JSON.parse(this.body);
    },
  };
}

const request = (method, { key = KEY, body, headers = {} } = {}) => ({
  method,
  headers: { ...(key ? { 'x-branchwork-key': key } : {}), ...headers },
  body,
});

const configuredHandler = () =>
  createStateHandler({ repository: memoryRepository(), accessKey: KEY, configured: true, workspaceId: 'test' });

test('live API fails closed when storage is not configured', async () => {
  const handler = createStateHandler({ repository: null, accessKey: KEY, configured: false });
  const res = mockResponse();
  await handler(request('GET'), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.json().error, 'not-configured');
});

test('live API rejects a missing or wrong access key', async () => {
  const handler = configuredHandler();
  for (const key of ['', 'wrong-key']) {
    const res = mockResponse();
    await handler(request('GET', { key }), res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.json().error, 'locked');
  }
});

test('first read creates an empty live workspace, never demo records', async () => {
  const handler = configuredHandler();
  const res = mockResponse();
  await handler(request('GET'), res);
  assert.equal(res.statusCode, 200);
  const payload = res.json();
  assert.equal(payload.revision, 1);
  assert.equal(payload.data.mode, 'live');
  assert.deepEqual(payload.data.ingredients, []);
  assert.deepEqual(payload.data.orders, []);
  assert.deepEqual(payload.data.employees, []);
  assert.equal(payload.data.branchName, 'BigBrew branch');
});

test('a write with the current revision is accepted and bumps the revision', async () => {
  const handler = configuredHandler();
  await handler(request('GET'), mockResponse());
  const next = { ...emptyWorkspace(), branchName: 'Cebu IT Park' };
  const res = mockResponse();
  await handler(request('PUT', { body: { revision: 1, data: next } }), res);
  assert.equal(res.statusCode, 200);
  const payload = res.json();
  assert.equal(payload.revision, 2);
  assert.equal(payload.data.branchName, 'Cebu IT Park');
});

test('a stale write is refused with the current workspace instead of overwriting it', async () => {
  const handler = configuredHandler();
  await handler(request('GET'), mockResponse());
  const first = { ...emptyWorkspace(), branchName: 'First device' };
  const accepted = mockResponse();
  await handler(request('PUT', { body: { revision: 1, data: first } }), accepted);
  assert.equal(accepted.json().revision, 2);

  const stale = { ...emptyWorkspace(), branchName: 'Second device' };
  const res = mockResponse();
  await handler(request('PUT', { body: { revision: 1, data: stale } }), res);
  assert.equal(res.statusCode, 409);
  const payload = res.json();
  assert.equal(payload.error, 'conflict');
  assert.equal(payload.revision, 2);
  assert.equal(payload.data.branchName, 'First device');

  const current = mockResponse();
  await handler(request('GET'), current);
  assert.equal(current.json().data.branchName, 'First device');
});

test('malformed and invalid workspaces are rejected before they reach storage', async () => {
  const handler = configuredHandler();
  await handler(request('GET'), mockResponse());

  const noRevision = mockResponse();
  await handler(request('PUT', { body: { data: emptyWorkspace() } }), noRevision);
  assert.equal(noRevision.statusCode, 400);

  const badShape = mockResponse();
  await handler(request('PUT', { body: { revision: 1, data: { version: 1, mode: 'live', orders: 'nope' } } }), badShape);
  assert.equal(badShape.statusCode, 422);
  assert.equal(badShape.json().error, 'invalid-workspace');

  const negativeCost = mockResponse();
  await handler(
    request('PUT', {
      body: { revision: 1, data: { ...emptyWorkspace(), costs: { ...emptyWorkspace().costs, setup: -5 } } },
    }),
    negativeCost,
  );
  assert.equal(negativeCost.statusCode, 422);
});

test('unsupported methods are reported rather than silently ignored', async () => {
  const handler = configuredHandler();
  const res = mockResponse();
  await handler(request('DELETE'), res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, 'GET, PUT');
});

test('config advertises live storage only when a key protects it', async () => {
  const live = mockResponse();
  createConfigHandler({ configured: true, accessKey: KEY })(request('GET'), live);
  assert.equal(live.statusCode, 200);
  assert.equal(live.json().mode, 'live');
  assert.equal(live.json().requiresKey, true);

  const local = mockResponse();
  createConfigHandler({ configured: false, accessKey: '' })(request('GET'), local);
  assert.equal(local.json().mode, 'local');
  assert.equal(local.json().storage, 'browser');
});

test('file repository keeps the same revision contract', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'branchwork-'));
  const file = join(dir, 'workspace.json');
  try {
    const repo = fileRepository(file);
    assert.equal(await repo.read(), null);
    const created = await repo.create('main', emptyWorkspace());
    assert.equal(created.revision, 1);
    assert.equal(await repo.create('main', emptyWorkspace()), null, 'second create is refused');
    assert.equal(await repo.update('main', 9, emptyWorkspace()), null, 'stale update refused');
    const updated = await repo.update('main', 1, { ...emptyWorkspace(), branchName: 'Mandaue' });
    assert.equal(updated.revision, 2);
    assert.equal((await repo.read()).data.branchName, 'Mandaue');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('the workspace guard accepts the live mode and rejects drift', () => {
  assert.equal(isDatabase(emptyWorkspace()), true);
  assert.equal(isDatabase({ ...emptyWorkspace(), mode: 'cloud' }), false);
  assert.equal(isDatabase({ ...emptyWorkspace(), movements: undefined }), false);
  assert.equal(isDatabase(null), false);
});
