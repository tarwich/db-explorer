'use server';

import { openConnection } from '@/app/actions/connections';
import { getStateDb } from '@/db/state-db';
import { deserializeDatabaseTable } from '@/types/connections';

export async function getTableInfo({
  connectionId,
  tableName,
}: {
  connectionId: string;
  tableName: string;
}) {
  const stateDb = await getStateDb();
  const serializedTableInfo = await stateDb
    .selectFrom('tables')
    .where('connectionId', '=', connectionId)
    .where('name', '=', tableName)
    .selectAll()
    .executeTakeFirst();

  if (!serializedTableInfo) {
    throw new Error('Table not found');
  }

  const deserializedTableInfo = deserializeDatabaseTable(serializedTableInfo);

  return deserializedTableInfo;
}

export async function getRecord({
  connectionId,
  tableName,
  pk,
}: {
  connectionId: string;
  tableName: string;
  pk: any;
}) {
  const db = await openConnection(connectionId);
  const tableInfo = await getTableInfo({ connectionId, tableName });
  const pkField = tableInfo.details.pk[0];

  const record = await db
    .selectFrom(tableInfo.name)
    .where(pkField, '=', pk)
    .selectAll()
    .executeTakeFirst();

  return record;
}

export async function updateRecord({
  connectionId,
  tableName,
  pk,
  record,
}: {
  connectionId: string;
  tableName: string;
  pk: any;
  record: any;
}) {
  const db = await openConnection(connectionId);
  const tableInfo = await getTableInfo({ connectionId, tableName });
  const pkField = tableInfo.details.pk[0];

  const updatedRecord = await db
    .updateTable(tableInfo.name)
    .set(record)
    .where(pkField, '=', pk)
    .returningAll()
    .executeTakeFirst();

  return updatedRecord;
}

export async function deleteRecord({
  connectionId,
  tableName,
  pk,
}: {
  connectionId: string;
  tableName: string;
  pk: any;
}) {
  const db = await openConnection(connectionId);
  const tableInfo = await getTableInfo({ connectionId, tableName });
  const pkField = tableInfo.details.pk[0];

  await db.deleteFrom(tableInfo.name).where(pkField, '=', pk).execute();
}
