'use server';

import { openConnection } from '@/app/api/connections';
import { loadConnection } from '@/components/connection-modal/connection-modal.actions';
import { getPlugin } from '@/db/plugins';
import { getStateDb } from '@/db/state-db';
import { DatabaseTable } from '@/types/connections';
import { getBestIcon, getBestIconForType } from '@/utils/best-icon';
import { determineDisplayColumns } from '@/utils/display-columns';
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

      // Get columns from the database
      const columns = await plugin.describeTable(db, table.name);

      // Create a temporary table object to determine display columns
      const tempTable = {
        name: table.name,
        schema: table.schema,
        connectionId,
        details: {
          normalizedName: normalizeName(table.name),
          singularName: title(singular(table.name)),
          pluralName: title(plural(table.name)),
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

      // Set icons for columns
      tempTable.details.columns = await Promise.all(
        tempTable.details.columns.map(async (c) => ({
          ...c,
          icon: await getBestIconForType(c.type),
        }))
      );

      // Determine which columns should be hidden by default
      tempTable.details.columns = tempTable.details.columns.map((c) => {
        // Hide columns that are typically not useful for display
        const shouldHide =
          // Hide common system columns
          [
            'created_at',
            'updated_at',
            'deleted_at',
            'version',
            'timestamp',
          ].includes(c.normalizedName) ||
          // Hide binary/large data columns
          ['blob', 'bytea', 'binary'].includes(c.type.toLowerCase()) ||
          // Hide columns with very long text
          (c.type.toLowerCase().includes('text') &&
            c.type.toLowerCase().includes('max') &&
            parseInt(c.type.match(/\d+/)?.[0] || '0') > 1000);

        return {
          ...c,
          hidden: shouldHide,
        };
      });

      // Determine display columns using the utility function
      const displayColumns = determineDisplayColumns(tempTable);

      // Use known table data if available, otherwise use the temporary table data
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
          displayColumns: knownTable?.details.displayColumns || displayColumns,
          pk: knownTable?.details.pk || [],
          columns: knownTable?.details.columns || tempTable.details.columns,
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

  // Set icons for columns
  table.details.columns = await Promise.all(
    table.details.columns.map(async (c) => ({
      ...c,
      icon: await getBestIconForType(c.type),
    }))
  );

  // Determine which columns should be hidden by default
  table.details.columns = table.details.columns.map((c) => {
    // Hide columns that are typically not useful for display
    const shouldHide =
      // Hide common system columns
      [
        'created at',
        'updated at',
        'deleted at',
        'version',
        'timestamp',
      ].includes(c.normalizedName) ||
      // Hide binary/large data columns
      ['blob', 'bytea', 'binary'].includes(c.type.toLowerCase()) ||
      // Hide columns with very long text
      (c.type.toLowerCase().includes('text') &&
        c.type.toLowerCase().includes('max') &&
        parseInt(c.type.match(/\d+/)?.[0] || '0') > 1000);

    return {
      ...c,
      hidden: shouldHide,
    };
  });

  // Determine display columns using the utility function
  table.details.displayColumns = determineDisplayColumns(table);

  return table;
}

export async function updateTable(
  connectionId: string,
  tableName: string,
  details: Partial<DatabaseTable['details']>
): Promise<DatabaseTable> {
  const stateDb = await getStateDb();
  const table = await getTable(connectionId, tableName);

  const updatedTable = {
    ...table,
    details: {
      ...table.details,
      ...details,
    },
  };

  await stateDb
    .updateTable('tables')
    .set(updatedTable)
    .where('connectionId', '=', connectionId)
    .where('name', '=', tableName)
    .execute();

  return updatedTable;
}

export async function getTableRecords(
  connectionId: string,
  tableName: string,
  options: {
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { page = 1, pageSize = 10 } = options;
  const db = await openConnection(connectionId);
  const table = await getTable(connectionId, tableName);

  // Get records with pagination
  const offset = (page - 1) * pageSize;
  const records = await db
    .selectFrom(tableName)
    .selectAll()
    .limit(pageSize)
    .offset(offset)
    .execute();

  // Get total count for pagination
  const [{ count }] = await db
    .selectFrom(tableName)
    .select((eb) => eb.fn.countAll().as('count'))
    .execute();

  return {
    records,
    pagination: {
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    },
  };
}
