import pg from 'pg';
import { env } from '../config/env.js';

/**
 * Postgres connection for the worker. A single pool is created lazily so
 * the service boots in dev/test without a live database; the first query
 * fails with context instead.
 *
 * Usage:
 *   import { getPool } from './db/client.js';
 *   await getPool().query('SELECT 1');
 */
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (pool) {
    return pool;
  }
  if (!env.DATABASE_URL) {
    throw new Error(
      '[db.client] DATABASE_URL is not set — cannot create a Postgres pool. ' +
        'Expected a connection string like postgres://user:***@host:5432/dbname',
    );
  }
  pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  return pool;
}

export async function closePool(): Promise<void> {
  if (!pool) {
    return;
  }
  await pool.end();
  pool = null;
}
