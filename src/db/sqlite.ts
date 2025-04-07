'use server';

import { StateDatabase } from '@/types/connections';
import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import * as path from 'path';

const DB_FILE = path.join(process.cwd(), 'state.local.sqlite3');

const dialect = new SqliteDialect({
  database: new SQLite(DB_FILE),
});

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
const sqliteDb = new Kysely<StateDatabase>({
  dialect,
});

export async function getStateDb() {
  return sqliteDb;
}
