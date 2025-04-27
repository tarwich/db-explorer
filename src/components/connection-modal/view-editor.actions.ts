'use server';

import { getTable } from '@/app/api/tables';
import { getStateDb } from '@/db/state-db';
import { LiteColumnInformation, storeJson } from '@/types/connections';
import { sort } from 'radash';

type ViewType = 'inline' | 'card' | 'list';

export async function updateColumn({
  connectionId,
  tableName,
  view,
  columnName,
  update,
}: {
  connectionId: string;
  tableName: string;
  view: ViewType;
  columnName: string;
  update: Partial<LiteColumnInformation>;
}) {
  const db = await getStateDb();

  if (!db) throw new Error('Failed to open connection');

  const table = await getTable(connectionId, tableName);

  if (!table) throw new Error('Table not found');

  const actualView = (() => {
    if (view === 'card') return (table.details.cardView ??= { columns: {} });
    if (view === 'list') return (table.details.listView ??= { columns: {} });
    if (view === 'inline')
      return (table.details.inlineView ??= { columns: {} });

    throw new Error('Invalid view type');
  })();

  // Handle column reordering
  if (update.order !== undefined) {
    const itemToUpdate = actualView.columns[columnName];
    delete actualView.columns[columnName];
    const oldList = sort(Object.entries(actualView.columns), (c) => c[1].order);

    const newList = Array.from({ length: oldList.length + 1 })
      .map((_, i): (typeof oldList)[number] => {
        if (i === update.order) {
          return [columnName, itemToUpdate];
        } else {
          const item = oldList.shift();
          if (item) return item;
          else throw new Error('No item found');
        }
      })
      .map(([name, item], i) => {
        return [name, { ...item, order: i }];
      });

    actualView.columns = Object.fromEntries(newList);
  }

  Object.assign(actualView, {
    ...actualView,
    columns: {
      ...actualView.columns,
      [columnName]: {
        ...actualView.columns[columnName],
        ...update,
      },
    },
  });

  const stateDb = await getStateDb();
  const existing = await stateDb
    .selectFrom('tables')
    .select('name')
    .where('connectionId', '=', connectionId)
    .where('name', '=', tableName)
    .executeTakeFirst();

  if (existing) {
    await stateDb
      .updateTable('tables')
      .set({ details: storeJson(table.details) })
      .where('connectionId', '=', connectionId)
      .where('name', '=', tableName)
      .execute();
  } else {
    await stateDb
      .insertInto('tables')
      .values({
        ...table,
        details: storeJson(table.details),
      })
      .execute();
  }
}
