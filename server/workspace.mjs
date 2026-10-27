/**
 * Shared live-workspace backend.
 *
 * One row in Postgres holds the whole branch database as JSON. Every write is
 * optimistic: the client sends the revision it read, the update only applies
 * if the row still has that revision, and a conflict returns the current
 * server copy so the browser can adopt it instead of overwriting someone.
 *
 * `DATABASE_URL` plus `BRANCHWORK_ACCESS_KEY` are both required for live mode.
 * Missing either one fails closed: the API reports `not-configured` and the
 * client stays in the clearly labelled offline workspace.
 */
import { timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const WORKSPACE_ID = process.env.BRANCHWORK_WORKSPACE_ID || 'main';
const CONNECTION_STRING = process.env.DATABASE_URL || '';
const ACCESS_KEY = process.env.BRANCHWORK_ACCESS_KEY || '';
// Local-only store used by the test suite and contributors without a database.
// Vercel never sets this, and it is refused in production.
const LOCAL_STORE =
  process.env.NODE_ENV === 'production' ? '' : process.env.BRANCHWORK_LOCAL_STORE || '';
const MAX_BODY_BYTES = 2 * 1024 * 1024;

export const emptyWorkspace = () => ({
  version: 1,
  mode: 'live',
  branchName: 'BigBrew branch',
  ingredients: [],
  movements: [],
  employees: [],
  orders: [],
  checklists: [],
  trainings: [],
  costs: { setup: 0, training: 0, monthlyTool: 0, wasteSavings: 0, refundSavings: 0, addedMargin: 0 },
});

const isArray = Array.isArray;
const isObject = (value) => !!value && typeof value === 'object' && !isArray(value);

export function isDatabase(value) {
  if (!isObject(value)) return false;
  const costs = value.costs;
  return (
    value.version === 1 &&
    (value.mode === 'live' || value.mode === 'local' || value.mode === 'sample') &&
    typeof value.branchName === 'string' &&
    isArray(value.ingredients) &&
    isArray(value.orders) &&
    isArray(value.movements) &&
    isArray(value.employees) &&
    isArray(value.checklists) &&
    isArray(value.trainings) &&
    isObject(costs) &&
    ['setup', 'training', 'monthlyTool', 'wasteSavings', 'refundSavings', 'addedMargin'].every(
      (key) => typeof costs[key] === 'number' && Number.isFinite(costs[key]) && costs[key] >= 0,
    )
  );
}

export const liveConfigured = () => Boolean((CONNECTION_STRING || LOCAL_STORE) && ACCESS_KEY);

function keyMatches(provided, expectedKey) {
  if (!expectedKey) return false;
  if (typeof provided !== 'string' || provided.length === 0) return false;
  const expected = Buffer.from(expectedKey);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** Neon over HTTP: no pool to exhaust from serverless invocations. */
export function neonRepository(connectionString) {
  let client;
  const sql = async (strings, ...values) => {
    if (!client) {
      const { neon } = await import('@neondatabase/serverless');
      client = neon(connectionString);
    }
    return client(strings, ...values);
  };
  return {
    async read(id) {
      const rows = await sql`select revision, data, updated_at from branchwork_workspace where id = ${id}`;
      return rows[0] || null;
    },
    async create(id, data) {
      const rows = await sql`
        insert into branchwork_workspace (id, revision, data)
        values (${id}, 1, ${JSON.stringify(data)}::jsonb)
        on conflict (id) do nothing
        returning revision, data, updated_at`;
      return rows[0] || null;
    },
    async update(id, expectedRevision, data) {
      const rows = await sql`
        update branchwork_workspace
        set revision = revision + 1, data = ${JSON.stringify(data)}::jsonb, updated_at = now()
        where id = ${id} and revision = ${expectedRevision}
        returning revision, data, updated_at`;
      return rows[0] || null;
    },
  };
}

/** JSON-file repository for local development and end-to-end tests only. */
export function fileRepository(file) {
  let writes = Promise.resolve();
  const read = async () => {
    try {
      return JSON.parse(await readFile(file, 'utf8'));
    } catch {
      return null;
    }
  };
  const write = (row) => {
    writes = writes.then(async () => {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(row));
    });
    return writes;
  };
  return {
    async read() {
      const row = await read();
      return row ? { revision: row.revision, data: row.data, updated_at: row.updated_at } : null;
    },
    async create(id, data) {
      const existing = await read();
      if (existing) return null;
      const row = { id, revision: 1, data, updated_at: new Date().toISOString() };
      await write(row);
      return row;
    },
    async update(id, expectedRevision, data) {
      const row = await read();
      if (!row || row.revision !== expectedRevision) return null;
      const next = { ...row, revision: row.revision + 1, data, updated_at: new Date().toISOString() };
      await write(next);
      return next;
    },
  };
}

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(body);
}

async function readJsonBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8') || '{}');
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/**
 * Builds the /api/state handler. `repository` is injectable so tests can run
 * the real routing, auth, and concurrency logic against an in-memory store.
 */
export function createStateHandler({
  repository,
  accessKey = ACCESS_KEY,
  configured = liveConfigured(),
  workspaceId = WORKSPACE_ID,
} = {}) {
  const authorized = (req) => {
    if (!accessKey) return false;
    return keyMatches(req.headers['x-branchwork-key'], accessKey);
  };

  return async function stateHandler(req, res) {
    if (!configured || !repository) {
      send(res, 503, {
        error: 'not-configured',
        message: 'Live storage needs DATABASE_URL and BRANCHWORK_ACCESS_KEY. The workspace is running offline.',
      });
      return;
    }
    if (!authorized(req)) {
      send(res, 401, { error: 'locked', message: 'This branch workspace needs its access key.' });
      return;
    }

    try {
      if (req.method === 'GET') {
        let row = await repository.read(workspaceId);
        if (!row) {
          const created = await repository.create(workspaceId, emptyWorkspace());
          row = created || (await repository.read(workspaceId));
        }
        if (!row) {
          send(res, 500, { error: 'unavailable', message: 'The workspace could not be created.' });
          return;
        }
        send(res, 200, { mode: 'live', revision: row.revision, data: row.data, updatedAt: row.updated_at });
        return;
      }

      if (req.method === 'PUT') {
        let body;
        try {
          body = await readJsonBody(req);
        } catch (error) {
          send(res, error.status || 400, { error: 'bad-request', message: 'The request body is not valid JSON.' });
          return;
        }
        const revision = Number(body?.revision);
        if (!Number.isInteger(revision) || revision < 1) {
          send(res, 400, { error: 'bad-request', message: 'A positive revision is required.' });
          return;
        }
        if (!isDatabase(body?.data)) {
          send(res, 422, { error: 'invalid-workspace', message: 'The workspace payload failed validation.' });
          return;
        }
        const updated = await repository.update(workspaceId, revision, body.data);
        if (updated) {
          send(res, 200, { mode: 'live', revision: updated.revision, data: updated.data, updatedAt: updated.updated_at });
          return;
        }
        const current = await repository.read(workspaceId);
        send(res, 409, {
          error: 'conflict',
          message: 'Another device saved a newer revision.',
          revision: current?.revision ?? null,
          data: current?.data ?? null,
        });
        return;
      }

      res.setHeader('Allow', 'GET, PUT');
      send(res, 405, { error: 'method-not-allowed' });
    } catch (error) {
      console.error('workspace error', error);
      send(res, 500, { error: 'unavailable', message: 'The branch database did not answer.' });
    }
  };
}

export function createConfigHandler({ configured = liveConfigured(), accessKey = ACCESS_KEY } = {}) {
  return function configHandler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      send(res, 405, { error: 'method-not-allowed' });
      return;
    }
    send(res, 200, {
      mode: configured ? 'live' : 'local',
      requiresKey: Boolean(configured && accessKey),
      storage: configured ? 'postgres' : 'browser',
    });
  };
}

let cachedRepository;
export function defaultRepository() {
  if (cachedRepository) return cachedRepository;
  if (LOCAL_STORE) {
    cachedRepository = fileRepository(LOCAL_STORE);
    return cachedRepository;
  }
  if (!CONNECTION_STRING) return null;
  cachedRepository = neonRepository(CONNECTION_STRING);
  return cachedRepository;
}

export const liveStateHandler = createStateHandler({ repository: defaultRepository() });
export const liveConfigHandler = createConfigHandler();
