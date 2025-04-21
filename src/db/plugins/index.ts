import { openConnection } from '@/app/api/connections';
import { DatabaseConnection } from '@/types/connections';
import { PostgresPlugin } from './plugin.postgres';
import { SqlitePlugin } from './plugin.sqlite';

export * from './plugin';
export * from './plugin.postgres';
export * from './plugin.sqlite';

export const PLUGINS = {
  postgres: PostgresPlugin,
  sqlite: SqlitePlugin,
};

export const getPlugin = async (connection: DatabaseConnection) => {
  if (!connection.id) {
    throw new Error('Connection ID is required');
  }

  const db = await openConnection(connection.id);

  return new PLUGINS[connection.type](db);
};
