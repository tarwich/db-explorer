'use server';

import { ICollection } from '@/components/explorer/types';
import { getStateDb } from '@/db/state-db';
import { isPostgresConnection, isSqliteConnection } from '@/types/connections';
import { basename } from 'node:path';

export async function getConnection({
  connectionId,
}: {
  connectionId: string;
}): Promise<ICollection> {
  const stateDb = await getStateDb();
  const connection = await stateDb
    .selectFrom('connections')
    .where('id', '=', connectionId)
    .selectAll()
    .executeTakeFirst();

  if (!connection) {
    throw new Error('Connection not found');
  }

  const subName = isPostgresConnection(connection)
    ? `${connection.details.username}@${connection.details.host}:${connection.details.port}/${connection.details.database}`
    : isSqliteConnection(connection)
    ? basename(connection.details.path)
    : '';

  return {
    id: connection.id || connection.name,
    name: connection.name,
    subName,
    icon: 'Database',
    type: 'collection',
    pluralName: 'Databases',
  };
}

export async function getTables({
  connectionId,
}: {
  connectionId: string;
}): Promise<ICollection[]> {
  const stateDb = await getStateDb();
  const tables = await stateDb
    .selectFrom('tables')
    .where('connectionId', '=', connectionId)
    .selectAll()
    .execute();

  return tables.map(
    (table): ICollection => ({
      id: table.name,
      name: table.name,
      pluralName: table.name,
      icon: 'Table',
      type: 'collection',
    })
  );
}
