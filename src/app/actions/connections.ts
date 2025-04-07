'use server';

import { getStateDb } from '@/db/sqlite';
import { DatabaseConnection } from '@/types/connections';
import { randomUUID } from 'crypto';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

export async function getConnections() {
  const db = await getStateDb();
  const connections = await db.selectFrom('connections').selectAll().execute();

  return connections;
}

export async function saveConnection(connection: Partial<DatabaseConnection>) {
  try {
    const db = await getStateDb();

    const existing = connection.id
      ? await db
          .selectFrom('connections')
          .where('id', '=', String(connection.id))
          .selectAll()
          .executeTakeFirst()
      : null;

    if (connection.id && existing) {
      await closeConnection(connection.id);
      return await db
        .updateTable('connections')
        .set({
          name: connection.name,
          type: connection.type,
          host: connection.host,
          port: connection.port,
          database: connection.database,
          username: connection.username,
          password: connection.password,
        })
        .where('id', '=', String(connection.id))
        .returningAll()
        .execute();
    } else {
      return await db
        .insertInto('connections')
        .values({
          id: randomUUID(),
          name: connection.name || '',
          type: connection.type || 'postgres',
          host: connection.host || '',
          port: connection.port || 0,
          database: connection.database || '',
          username: connection.username || '',
          password: connection.password || '',
        })
        .returningAll()
        .execute();
    }
  } catch (error) {
    console.error('Failed to save connection:', error);
    throw error;
  }
}

export async function deleteConnection(connectionId: string) {
  const db = await getStateDb();
  await db.deleteFrom('connections').where('id', '=', connectionId).execute();
}

export async function getConnection(id: string) {
  const db = await getStateDb();
  const connection = await db
    .selectFrom('connections')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst();

  return connection;
}

export async function testConnection(connection: DatabaseConnection) {
  const db = new Kysely({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: connection.host,
        port: connection.port,
        database: connection.database,
        user: connection.username,
        password: connection.password,
      }),
    }),
  });

  try {
    await sql`SELECT 1`.execute(db);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

const connectionCache = new Map<string, Kysely<any>>();

export async function openConnection(
  connectionId: string
): Promise<Kysely<any>> {
  const cachedConnection = connectionCache.get(connectionId);

  if (cachedConnection) {
    return cachedConnection;
  }

  const connection = await getConnection(connectionId);

  if (!connection) {
    throw new Error('Connection not found');
  }

  console.log(
    'Opening new connection',
    `${connection.host}:${connection.port}/${connection.database}`
  );
  const db = new Kysely({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: connection.host,
        port: connection.port,
        database: connection.database,
        user: connection.username,
        password: connection.password,
      }),
    }),
    // log: ['query'],
  });

  connectionCache.set(connectionId, db);

  return db;
}

export async function closeConnection(connectionId: string) {
  const db = connectionCache.get(connectionId);

  if (db) {
    console.log('Closing connection', connectionId);
    await db.destroy();
    connectionCache.delete(connectionId);
  }
}
