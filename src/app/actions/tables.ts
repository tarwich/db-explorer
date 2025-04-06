'use server';

import { DatabaseConnection, DatabaseTable } from '@/types/connections';
import pg from 'pg';
import { getServerState, saveState } from '../state';
import { getConnection } from './connections';

export async function getTables() {
  const state = await getServerState();
  if (!state.selectedConnectionId) {
    throw new Error('No connection selected');
  }

  const connection = await getConnection(state.selectedConnectionId);

  if (!connection.tables?.length) {
    await analyzeTables(connection);
  }

  return connection.tables;
}

export async function analyzeTables(connection: DatabaseConnection) {
  if (!connection) throw new Error('Connection is required');

  const client = new pg.Client({
    host: connection.host,
    port: connection.port,
    database: connection.database,
    user: connection.username,
    password: connection.password,
  });

  try {
    await client.connect();

    // Query to get all tables and views
    const result = await client.query(`
      SELECT
        n.nspname as schema,
        c.relname as name,
        CASE c.relkind
          WHEN 'r' THEN 'table'
          WHEN 'v' THEN 'view'
          WHEN 'm' THEN 'materialized view'
          ELSE c.relkind::text
        END as type,
        d.description
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0
      WHERE c.relkind IN ('r', 'v', 'm')
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY n.nspname, c.relname;
    `);

    const tables: DatabaseTable[] = result.rows.map((row) => ({
      id: `${row.schema}.${row.name}`,
      schema: row.schema,
      name: row.name,
      type: row.type,
      description: row.description,
    }));

    // Update the connection's tables
    const state = await getServerState();
    const connectionIndex = state.connections.findIndex(
      (c) => c.id === connection.id
    );
    if (connectionIndex !== -1) {
      state.connections[connectionIndex].tables = tables;
      await saveState();
    }

    return tables;
  } finally {
    await client.end();
  }
}
