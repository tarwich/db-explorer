'use server';

import { openConnection } from '@/app/actions/connections';
import { getStateDb } from '@/db/sqlite';
import { deserializeDatabaseTable } from '@/types/connections';
import { maybe } from '@/utils/maybe';

export async function getTableInfo({
  connectionId,
  tableName,
}: {
  connectionId: string;
  tableName: string;
}) {
  const stateDb = await getStateDb();

  const tableInfo = await stateDb
    .selectFrom('tables')
    .selectAll()
    .where('connectionId', '=', connectionId)
    .where('name', '=', tableName)
    .executeTakeFirst()
    .then(maybe(deserializeDatabaseTable));

  return tableInfo;
}

export async function getRows({
  connectionId,
  tableName,
  filter,
  page,
  pageSize,
}: {
  connectionId: string;
  tableName: string;
  filter?: string;
  page: number;
  pageSize: number;
}) {
  const db = await openConnection(connectionId);

  const query = db
    .selectFrom(tableName)
    .selectAll()
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  if (filter) {
    throw new Error('Filter not implemented');
  }

  const rows = await query.execute();

  return rows;
}
