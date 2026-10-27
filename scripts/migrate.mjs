/**
 * Applies db/schema.sql to the configured Postgres database.
 *
 *   DATABASE_URL=postgres://... npm run db:migrate
 *
 * Safe to re-run: every statement is idempotent.
 */
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || '';
if (!connectionString) {
  console.error('DATABASE_URL is not set. Add the Neon connection string to the environment first.');
  process.exit(1);
}

const sql = neon(connectionString);
const source = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');

const statements = source
  .split(';')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

for (const statement of statements) {
  await sql(statement);
  console.log(`applied: ${statement.split('\n')[0].trim()}`);
}

const [{ count } = { count: 0 }] = await sql`select count(*)::int as count from branchwork_workspace`;
console.log(`Schema ready. Workspace rows: ${count}`);
