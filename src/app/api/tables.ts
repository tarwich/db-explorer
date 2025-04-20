'use server';

import { openConnection } from '@/app/api/connections';
import { loadConnection } from '@/components/connection-modal/connection-modal.actions';
import { getPlugin } from '@/db/plugins';
import { getStateDb } from '@/db/state-db';
import { DatabaseTable } from '@/types/connections';
import { getBestIcon, getBestIconForType } from '@/utils/best-icon';
import { normalizeName } from '@/utils/normalize-name';
import { plural, singular } from 'pluralize';
import { title } from 'radash';

export async function getTables(connectionId: string) {
  const connection = await loadConnection(connectionId);

  if (!connection) {
    return [];
  }

  const db = await openConnection(connectionId);

  const stateDb = await getStateDb();
  const knownTables = Object.fromEntries(
    await stateDb
      .selectFrom('tables')
      .where('connectionId', '=', connectionId)
      .selectAll()
      .execute()
      .then((rows) => rows.map((r) => [r.name, r]))
  );

  const plugin = getPlugin(connection);
  const dbTables = await plugin.listTables(db);

  const tables = await Promise.all(
    dbTables.map(async (table): Promise<DatabaseTable> => {
      const knownTable = knownTables[table.name];

      return {
        name: knownTable?.name || table.name,
        schema: knownTable?.schema || table.schema,
        connectionId,
        details: {
          normalizedName:
            knownTable?.details.normalizedName || normalizeName(table.name),
          singularName:
            knownTable?.details.singularName || title(singular(table.name)),
          pluralName:
            knownTable?.details.pluralName || title(plural(table.name)),
          icon: knownTable?.details.icon || (await getBestIcon(table.name)),
          color: knownTable?.details.color || 'green',
          displayColumns: knownTable?.details.displayColumns || [],
          pk: knownTable?.details.pk || [],
          columns: knownTable?.details.columns || [],
        },
      };
    })
  );

  return tables;
}

export async function getTable(
  connectionId: string,
  tableId: string
): Promise<DatabaseTable> {
  const connection = await loadConnection(connectionId);

  if (!connection) {
    throw new Error('Connection not found');
  }

  const stateDb = await getStateDb();
  const knownTable = await stateDb
    .selectFrom('tables')
    .selectAll()
    .where('connectionId', '=', connectionId)
    .where('name', '=', tableId)
    .executeTakeFirst();

  if (knownTable) {
    return knownTable;
  }

  const db = await openConnection(connectionId);
  const columns = await getPlugin(connection).describeTable(db, tableId);

  const table = {
    name: tableId,
    schema: 'public',
    connectionId,
    details: {
      normalizedName: normalizeName(tableId),
      singularName: title(singular(tableId)),
      pluralName: title(plural(tableId)),
      icon: 'Table',
      color: 'green',
      displayColumns: [],
      pk: [],
      columns: columns.map((c) => ({
        name: c.name,
        type: c.type,
        displayName: title(c.name),
        icon: 'Box',
        nullable: c.isNullable,
        normalizedName: normalizeName(c.name),
        userDefined: c.userDefined,
        hidden: false,
      })),
    },
  } as DatabaseTable;

  table.details.columns = await Promise.all(
    table.details.columns.map(async (c) => ({
      ...c,
      icon: await getBestIconForType(c.type),
    }))
  );

  return table;
}
