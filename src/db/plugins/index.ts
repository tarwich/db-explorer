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

export const getPlugin = (connection: DatabaseConnection) => {
  return PLUGINS[connection.type];
};
