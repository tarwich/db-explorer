'use server';

import { openConnection } from '@/app/api/connections';
import { loadConnection } from '@/components/connection-modal/connection-modal.actions';
import { TIconName } from '@/components/explorer/item-views/item-icon';
import { getPlugin } from '@/db/plugins';
import { getStateDb } from '@/db/state-db';
import { DatabaseTable, LiteColumnDictionary } from '@/types/connections';
import { getBestIcon } from '@/utils/best-icon';
import { normalizeName } from '@/utils/normalize-name';
import { plural, singular } from 'pluralize';
import { alphabetical, objectify, sort, title } from 'radash';
import logger from '../../lib/logger';

export async function getTables(connectionId: string) {
  const stateDb = await getStateDb();
  const db = await openConnection(connectionId);

  const knownTables = await stateDb
    .selectFrom('tables')
    .selectAll()
    .where('connectionId', '=', connectionId)
    .execute();

  const knownTablesMap = objectify(knownTables, (k) => k.name);

  const tables = await db
    .selectFrom('information_schema.tables')
    .where('table_schema', '=', 'public')
    .selectAll()
    .execute();

  const formattedTables = tables.map(
    (t): (typeof knownTablesMap)[keyof typeof knownTablesMap] => {
      const knownTable = knownTablesMap[t.table_name];
      const pluralName =
        knownTable?.details.pluralName || title(plural(t.table_name));

      return {
        connectionId,
        name: t.table_name,
        schema: t.table_schema,
        details: {
          normalizedName:
            knownTable?.details.normalizedName || normalizeName(t.table_name),
          singularName:
            knownTable?.details.singularName || title(singular(t.table_name)),
          pluralName,
          icon: knownTable?.details.icon || getBestIcon(pluralName) || 'Table',
          color: knownTable?.details.color || 'green',
          pk: knownTable?.details.pk || [],
          columns: knownTable?.details.columns || [],
          inlineView: knownTable?.details.inlineView || {},
          cardView: knownTable?.details.cardView || {},
          listView: knownTable?.details.listView || {},
        },
      };
    }
  );

  return alphabetical(formattedTables, (t) => t.details.normalizedName);
}

export async function getTable(
  connectionId: string,
  name: string
): Promise<DatabaseTable> {
  try {
    const db = await loadConnection(connectionId);
    const stateDb = await getStateDb();

    if (!db) {
      logger.error('Connection not found', { connectionId });
      throw new Error('Connection not found');
    }

    const knownTable = await stateDb
      .selectFrom('tables')
      .selectAll()
      .where('connectionId', '=', connectionId)
      .where('name', '=', name)
      .executeTakeFirst();

    const dbPlugin = await getPlugin(db);
    const dbColumns = await dbPlugin.describeTable(name);
    const formattedColumns = await Promise.all(
      dbColumns.map(
        async (c): Promise<DatabaseTable['details']['columns'][string]> => {
          const knownColumn = knownTable?.details.columns[c.name];
          return {
            name: c.name,
            normalizedName: normalizeName(c.name),
            icon: knownColumn?.icon || (await getBestIcon(c.name)) || 'Table',
            displayName: knownColumn?.displayName || title(c.name),
            type: c.type,
            nullable: c.isNullable,
            hidden: knownColumn?.hidden ?? false,
            order: knownColumn?.order ?? Infinity,
            enumOptions: knownColumn?.enumOptions,
            foreignKey: knownColumn?.foreignKey,
          };
        }
      )
    );
    sort(formattedColumns, (c) => c.order).forEach((c, i) => {
      c.order = i;
    });

    const columns = objectify(formattedColumns, (c) => c.name);

    const updateViewColumns = (columns?: LiteColumnDictionary) => {
      const result: LiteColumnDictionary = {};

      for (const formattedColumn of formattedColumns) {
        const column = columns?.[formattedColumn.name];

        result[formattedColumn.name] = {
          ...column,
          order: column?.order ?? formattedColumn.order ?? Infinity,
          hidden: column?.hidden ?? formattedColumn.hidden ?? false,
        };
      }

      sort(Object.values(result), (c) => c.order).forEach((c, i) => {
        c.order = i;
      });

      return result;
    };

    const formattedTable: DatabaseTable = {
      connectionId,
      name,
      schema: 'public',
      details: {
        normalizedName: normalizeName(name),
        singularName: knownTable?.details.singularName || title(singular(name)),
        pluralName: knownTable?.details.pluralName || title(plural(name)),
        color: knownTable?.details.color || 'green',
        icon:
          (knownTable?.details.icon as TIconName) ||
          getBestIcon(name) ||
          'Table',
        pk: knownTable?.details.pk || [],
        columns,
        inlineView: {
          ...knownTable?.details.inlineView,
          columns: updateViewColumns(knownTable?.details.inlineView?.columns),
        },
        cardView: {
          ...knownTable?.details.cardView,
          columns: updateViewColumns(knownTable?.details.cardView?.columns),
        },
        listView: {
          ...knownTable?.details.listView,
          columns: updateViewColumns(knownTable?.details.listView?.columns),
        },
      },
    };

    return formattedTable;
  } catch (error) {
    logger.error('Failed to get table:', error);
    throw error;
  }
}

function shouldColumnBeHidden(
  column: DatabaseTable['details']['columns'][string]
) {
  if (
    column.type === 'uuid' ||
    column.type === 'jsonb' ||
    column.type === 'json'
  )
    return true;

  if (column.normalizedName.endsWith(' id')) return true;

  return false;
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

  // --- FK display value resolution ---
  // 1. Find all columns with a foreignKey
  const fkColumns = Object.values(table.details.columns).filter(
    (col) => col.foreignKey
  );

  // 2. For each FK column, collect all unique FK values in this page
  const fkValueMap: Record<string, Set<any>> = {};
  for (const col of fkColumns) {
    fkValueMap[col.name] = new Set(
      records.map((r) => r[col.name]).filter((v) => v != null)
    );
  }

  // 3. For each FK column, batch fetch related records
  const fkDisplayMap: Record<string, Record<any, string>> = {};
  for (const col of fkColumns) {
    const fk = col.foreignKey!;
    const targetTable = await getTable(connectionId, fk.targetTable);
    const displayColumns =
      require('@/utils/display-columns').determineDisplayColumns(targetTable);
    const values = Array.from(fkValueMap[col.name]);
    if (values.length === 0) {
      fkDisplayMap[col.name] = {};
      continue;
    }
    // Fetch related records
    const relatedRecords = await db
      .selectFrom(fk.targetTable)
      .select([...displayColumns, fk.targetColumn])
      .where(fk.targetColumn, 'in', values)
      .execute();
    // Map FK value to display value (join display columns with space)
    fkDisplayMap[col.name] = Object.fromEntries(
      relatedRecords.map((r: any) => [
        r[fk.targetColumn],
        displayColumns
          .map((colName: string) => r[colName])
          .filter(Boolean)
          .join(' '),
      ])
    );
  }

  // 4. Replace FK values in records with display value
  const recordsWithDisplay = records.map((record) => {
    const newRecord = { ...record };
    for (const col of fkColumns) {
      const val = record[col.name];
      if (val != null && fkDisplayMap[col.name][val] !== undefined) {
        newRecord[col.name] = fkDisplayMap[col.name][val];
      }
    }
    return newRecord;
  });

  return {
    records: recordsWithDisplay,
    pagination: {
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    },
  };
}

export async function saveTable(table: DatabaseTable): Promise<DatabaseTable> {
  const stateDb = await getStateDb();

  // Check if the table already exists
  const existingTable = await stateDb
    .selectFrom('tables')
    .where('connectionId', '=', table.connectionId)
    .where('name', '=', table.name)
    .select('name')
    .executeTakeFirst();

  if (existingTable) {
    // Update existing table
    await stateDb
      .updateTable('tables')
      .set({
        schema: table.schema,
        details: JSON.stringify(table.details) as any,
      })
      .where('connectionId', '=', table.connectionId)
      .where('name', '=', table.name)
      .execute();
  } else {
    // Insert new table
    await stateDb
      .insertInto('tables')
      .values({
        name: table.name,
        schema: table.schema,
        connectionId: table.connectionId,
        details: JSON.stringify(table.details) as any,
      })
      .execute();
  }

  return table;
}
