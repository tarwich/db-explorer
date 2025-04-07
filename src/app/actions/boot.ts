'use server';

import { getStateDb } from '@/db/sqlite';
import { getServerState } from '../state';

export async function boot() {
  const db = await getStateDb();

  const allTables = Object.fromEntries(
    (await db.introspection.getTables()).map((table) => [table.name, table])
  );

  if (!allTables.connections) {
    console.log('Create table: connections');
    await db.schema
      .createTable('connections')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('name', 'text', (column) => column.notNull())
      .addColumn('type', 'text', (column) => column.notNull())
      .addColumn('host', 'text', (column) => column.notNull())
      .addColumn('port', 'integer', (column) => column.notNull())
      .addColumn('database', 'text', (column) => column.notNull())
      .addColumn('username', 'text', (column) => column.notNull())
      .addColumn('password', 'text', (column) => column.notNull())
      .execute();
  }

  if (!allTables.tables) {
    console.log('Create table: tables');
    await db.schema
      .createTable('tables')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('name', 'text', (column) => column.notNull())
      .addColumn('schema', 'text', (column) => column.notNull())
      .addColumn('connectionId', 'uuid', (column) => column.notNull())
      .addColumn('details', 'json', (column) => column.notNull())
      .execute();
  }

  const state = await getServerState();

  return state;
}
