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

  if (connection && typeof connection.details === 'string') {
    connection.details = JSON.parse(connection.details);
  }

  return connection;
}

async function createPostgresConnection(connection: any, sslConfig: any) {
  return new Kysely({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: connection.details.host,
        port: connection.details.port,
        database: connection.details.database,
        user: connection.details.username,
        password: connection.details.password,
        ssl: sslConfig,
      }),
    }),
  });
}

export async function testConnection(connection: DatabaseConnection) {
  try {
    if (isPostgresConnection(connection)) {
      // Try SSL first unless explicitly disabled
      if (connection.details.sslMode !== 'disable') {
        try {
          const sslConfig = connection.details.sslMode === 'verify-full' 
            ? { rejectUnauthorized: true }
            : { rejectUnauthorized: false };
          
          const db = await createPostgresConnection(connection, sslConfig);
          await sql`SELECT 1`.execute(db);
          return true;
        } catch (error: any) {
          // Check if error is SSL-related
          const errorMessage = error.message || '';
          if (errorMessage.includes('server does not support SSL connections') ||
              errorMessage.includes('SSL connection has been closed unexpectedly') ||
              errorMessage.includes('SSL is not enabled on the server')) {
            logger.info('SSL connection failed, falling back to non-SSL:', errorMessage);
            
            // Try without SSL
            const db = await createPostgresConnection(connection, false);
            await sql`SELECT 1`.execute(db);
            return true;
          }
          throw error;
        }
      } else {
        // SSL explicitly disabled
        const db = await createPostgresConnection(connection, false);
        await sql`SELECT 1`.execute(db);
        return true;
      }
    } else if (isSqliteConnection(connection)) {
      const db = new Kysely({
        dialect: new SqliteDialect({
          database: async () => new SqliteDatabase(connection.details.path),
        }),
      });
      await sql`SELECT 1`.execute(db);
      return true;
    } else {
      throw new Error('Invalid connection type');
    }
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

  const db = await (async () => {
    if (isPostgresConnection(connection)) {
      console.log(
        'Opening new connection',
        `${connection.details.username}@${connection.details.host}:${connection.details.port}/${connection.details.database}`
      );
      
      // Try SSL first unless explicitly disabled
      if (connection.details.sslMode !== 'disable') {
        try {
          const sslConfig = connection.details.sslMode === 'verify-full' 
            ? { rejectUnauthorized: true }
            : { rejectUnauthorized: false };
          
          const db = await createPostgresConnection(connection, sslConfig);
          // Test the connection
          await sql`SELECT 1`.execute(db);
          return db;
        } catch (error: any) {
          // Check if error is SSL-related
          const errorMessage = error.message || '';
          if (errorMessage.includes('server does not support SSL connections') ||
              errorMessage.includes('SSL connection has been closed unexpectedly') ||
              errorMessage.includes('SSL is not enabled on the server')) {
            logger.info('SSL connection failed during openConnection, falling back to non-SSL:', errorMessage);
            
            // Try without SSL
            return await createPostgresConnection(connection, false);
          }
          throw error;
        }
      } else {
        // SSL explicitly disabled
        return await createPostgresConnection(connection, false);
      }
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
