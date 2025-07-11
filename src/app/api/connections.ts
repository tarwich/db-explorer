'use server';

import { getStateDb } from '@/db/state-db';
import {
  DatabaseConnection,
  isPostgresConnection,
  isSqliteConnection,
} from '@/types/connections';
import SqliteDatabase from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { Kysely, PostgresDialect, sql, SqliteDialect } from 'kysely';
import { Pool } from 'pg';
import logger from '../../lib/logger';

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
          details: connection.details,
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
          details: connection.details as any,
        })
        .returningAll()
        .execute();
    }
  } catch (error) {
    logger.error('Failed to save connection:', error);
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
  try {
    const db = isPostgresConnection(connection)
      ? new Kysely({
          dialect: new PostgresDialect({
            pool: new Pool({
              host: connection.details.host,
              port: connection.details.port,
              database: connection.details.database,
              user: connection.details.username,
              password: connection.details.password,
              ssl:
                connection.details.sslMode === 'disable'
                  ? false
                  : {
                      rejectUnauthorized:
                        connection.details.sslMode === 'verify-full'
                          ? true
                          : false,
                    },
            }),
          }),
        })
      : isSqliteConnection(connection)
      ? new Kysely({
          dialect: new SqliteDialect({
            database: async () => new SqliteDatabase(connection.details.path),
          }),
        })
      : null;

    if (!db) {
      throw new Error('Invalid connection type');
    }

    await sql`SELECT 1`.execute(db);
    return true;
  } catch (error) {
    logger.error('Failed to test connection:', error);
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
    logger.error('Connection not found', { connectionId });
    throw new Error('Connection not found');
  }

  const db = (() => {
    if (isPostgresConnection(connection)) {
      console.log(
        'Opening new connection',
        `${connection.details.username}@${connection.details.host}:${connection.details.port}/${connection.details.database}`
      );
      const ssl =
        connection.details.sslMode === 'disable'
          ? false
          : {
              rejectUnauthorized:
                connection.details.sslMode === 'verify-full' ? true : false,
            };
      return new Kysely({
        dialect: new PostgresDialect({
          pool: new Pool({
            host: connection.details.host,
            port: connection.details.port,
            database: connection.details.database,
            user: connection.details.username,
            password: connection.details.password,
            ssl,
          }),
        }),
      });
    } else if (isSqliteConnection(connection)) {
      console.log('Opening new connection', connection.details.path);
      return new Kysely({
        dialect: new SqliteDialect({
          database: async () => new SqliteDatabase(connection.details.path),
        }),
      });
    }

    logger.error('Invalid connection type', { connection });
    throw new Error('Invalid connection type');
  })();

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
