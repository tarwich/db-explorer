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
  const tableInfo = await getTableInfo({ connectionId, tableName });

  let query = db
    .selectFrom(tableName)
    .selectAll()
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  if (filter) {
    const searchColumn = tableInfo?.details.columns.find(
      (column) =>
        (column.type.includes('text') || column.type.includes('json')) &&
        column.normalizedName.includes('search')
    );
    if (searchColumn) {
      query = query.where(searchColumn.name, 'ilike', `%${filter}%`);
    } else if (tableInfo?.details.displayColumns?.length) {
      query = query.where((builder) =>
        builder.or(
          tableInfo.details.displayColumns.map((column) =>
            builder(column, 'ilike', `%${filter}%`)
          )
        )
      );
    }
  }

  console.log(query.compile());

  const rows = await query.execute();

  return rows;
}
