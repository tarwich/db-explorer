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

  // Use plugin abstraction for table listing, pass DatabaseConnection
  const connection = await loadConnection(connectionId);
  if (!connection) {
    throw new Error('Connection not found');
  }
  const dbPlugin = await getPlugin(connection);
  const tables = await dbPlugin.listTables();

  const formattedTables = await Promise.all(
    tables.map(async (t) => {
      const knownTable = knownTablesMap[t.name];
      const pluralName =
        knownTable?.details.pluralName || title(plural(t.name));

      // Always provide columns as a dictionary, not an array
      let columns: Record<string, any> = {};
      if (
        knownTable?.details.columns &&
        !Array.isArray(knownTable.details.columns)
      ) {
        columns = knownTable.details.columns;
      } else {
        // Introspect columns if missing
        const dbColumns = await dbPlugin.describeTable(t.name);
        // Resolve icons for all columns in parallel
        const columnsArr = await Promise.all(
          dbColumns.map(async (c: any, i: number) => ({
            name: c.name,
            normalizedName: normalizeName(c.name),
            icon: (await getBestIcon(c.name)) || 'Table',
            displayName: title(c.name),
            type: c.type,
            nullable: c.isNullable,
            hidden: false,
            order: i,
            isGenerated: c.isGenerated || false,
          }))
        );
        columns = objectify(columnsArr, (c) => c.name);
      }

      // Get primary keys if not already known
      let primaryKeys = knownTable?.details.pk;
      if (!primaryKeys || primaryKeys.length === 0) {
        primaryKeys = await dbPlugin.getPrimaryKeys(t.name, t.schema);
      }

      const inlineView = knownTable?.details.inlineView || {};
      const cardView = knownTable?.details.cardView || {};
      const listView = knownTable?.details.listView || {};

      return {
        connectionId,
        name: t.name,
        schema: t.schema,
        details: {
          normalizedName:
            knownTable?.details.normalizedName || normalizeName(t.name),
          singularName:
            knownTable?.details.singularName || title(singular(t.name)),
          pluralName,
          icon: knownTable?.details.icon || getBestIcon(pluralName) || 'Table',
          color: knownTable?.details.color || 'green',
          pk: primaryKeys || [],
          columns,
          inlineView: {
            ...inlineView,
            columns: inlineView.columns || {},
          },
          cardView: {
            ...cardView,
            columns: cardView.columns || {},
          },
          listView: {
            ...listView,
            columns: listView.columns || {},
          },
        },
      };
    })
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

    // Get primary keys if not already known
    let primaryKeys = knownTable?.details.pk;
    if (!primaryKeys || primaryKeys.length === 0) {
      primaryKeys = await dbPlugin.getPrimaryKeys(name, 'public');
    }

    const updateViewColumns = (columns?: LiteColumnDictionary) => {
      const result: LiteColumnDictionary = {};

      // Add regular database columns
      for (const formattedColumn of formattedColumns) {
        const column = columns?.[formattedColumn.name];

        result[formattedColumn.name] = {
          ...column,
          order: column?.order ?? formattedColumn.order ?? Infinity,
          hidden: column?.hidden ?? formattedColumn.hidden ?? false,
        };
      }

      // Add calculated columns
      const calculatedColumns = knownTable?.details.calculatedColumns || [];
      for (const calcColumn of calculatedColumns) {
        const calcColumnKey = `calc_${calcColumn.id}`;
        const column = columns?.[calcColumnKey];

        result[calcColumnKey] = {
          ...column,
          order: column?.order ?? calcColumn.order ?? Infinity,
          hidden: column?.hidden ?? calcColumn.hidden ?? false,
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
        pk: primaryKeys || [],
        columns,
        calculatedColumns: knownTable?.details.calculatedColumns || [],
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
  
  // For SQLite tables without explicit primary keys, include rowid
  const connection = await loadConnection(connectionId);
  const hasExplicitPk = table.details.pk && table.details.pk.length > 0 && !table.details.pk.includes('rowid');
  
  // Determine sort columns for deterministic ordering
  const getSortColumns = (table: DatabaseTable) => {
    const pk = table.details.pk;
    if (pk && pk.length > 0) {
      return pk; // Use primary key columns for sorting
    }
    
    // Fallback: use the first column for sorting
    const firstColumn = Object.keys(table.details.columns)[0];
    if (firstColumn) {
      return [firstColumn];
    }
    
    // Last resort: use 'rowid' for SQLite
    if (connection!.type === 'sqlite') {
      return ['rowid'];
    }
    
    return [];
  };

  const sortColumns = getSortColumns(table);
  
  let records: any[];
  if (connection!.type === 'sqlite' && !hasExplicitPk) {
    // For SQLite tables relying on implicit rowid, explicitly select it
    let query = db
      .selectFrom(tableName)
      .select(['rowid', '*']);
    
    // Add deterministic ordering
    if (sortColumns.length > 0) {
      sortColumns.forEach(col => {
        query = query.orderBy(col, 'asc');
      });
    }
    
    records = await query
      .limit(pageSize)
      .offset(offset)
      .execute() as any[];
  } else {
    let query = db
      .selectFrom(tableName)
      .selectAll();
    
    // Add deterministic ordering
    if (sortColumns.length > 0) {
      sortColumns.forEach(col => {
        query = query.orderBy(col, 'asc');
      });
    }
    
    records = await query
      .limit(pageSize)
      .offset(offset)
      .execute();
  }

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
      records.map((r: any) => r[col.name]).filter((v) => v != null)
    );
  }

  // 3. For each FK column, batch fetch related records
  const fkDisplayMap: Record<
    string,
    Record<any, { displayValue: string; icon: string }>
  > = {};
  for (const col of fkColumns) {
    const fk = col.foreignKey!;
    const targetTable = await getTable(connectionId, fk.targetTable);
    const displayColumns =
      require('@/utils/display-columns').determineDisplayColumns({
        ...targetTable,
        details: {
          ...targetTable.details,
          columns: Object.values(targetTable.details.columns),
        },
      });
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
    // Map FK value to display value and icon
    fkDisplayMap[col.name] = Object.fromEntries(
      relatedRecords.map((r: any) => [
        r[fk.targetColumn],
        {
          displayValue: displayColumns
            .map((colName: string) => r[colName])
            .filter(Boolean)
            .join(' '),
          icon: targetTable.details.icon,
        },
      ])
    );
  }

  // 4. Replace FK values in records with display value and icon
  const recordsWithDisplay = records.map((record: any) => {
    const newRecord: Record<string, any> = { ...record };
    for (const col of fkColumns) {
      const val = record[col.name];
      if (val != null && fkDisplayMap[col.name][val] !== undefined) {
        // Get the related table's icon
        const fk = col.foreignKey!;
        // Find the icon from the already-fetched table (from previous getTable call)
        // (We could optimize by caching, but for now, fetch again)
        newRecord[col.name] = {
          value: fkDisplayMap[col.name][val].displayValue,
          icon: fkDisplayMap[col.name][val].icon,
        };
      }
    }
    // For non-FK fields, keep as is
    for (const colName in newRecord) {
      if (!fkColumns.find((c) => c.name === colName)) {
        newRecord[colName] = record[colName];
      }
    }
    return newRecord;
  });

  // 5. Add calculated columns to records
  const {
    addCalculatedColumnsToRecords,
  } = require('@/utils/calculated-columns');
  const finalRecords = addCalculatedColumnsToRecords(
    recordsWithDisplay,
    table.details.calculatedColumns || []
  );

  return {
    records: finalRecords,
    pagination: {
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    },
  };
}

export async function getTableRecordsInfinite(
  connectionId: string,
  tableName: string,
  options: {
    offset?: number;
    limit?: number;
  } = {}
) {
  const { offset = 0, limit = 50 } = options;
  const db = await openConnection(connectionId);
  const table = await getTable(connectionId, tableName);
  
  // For SQLite tables without explicit primary keys, include rowid
  const connection = await loadConnection(connectionId);
  const hasExplicitPk = table.details.pk && table.details.pk.length > 0 && !table.details.pk.includes('rowid');
  
  // Determine sort columns for deterministic ordering
  const getSortColumns = (table: DatabaseTable) => {
    const pk = table.details.pk;
    if (pk && pk.length > 0) {
      return pk; // Use primary key columns for sorting
    }
    
    // Fallback: use the first column for sorting
    const firstColumn = Object.keys(table.details.columns)[0];
    if (firstColumn) {
      return [firstColumn];
    }
    
    // Last resort: use 'rowid' for SQLite
    if (connection!.type === 'sqlite') {
      return ['rowid'];
    }
    
    return [];
  };

  const sortColumns = getSortColumns(table);
  
  let records: any[];
  if (connection!.type === 'sqlite' && !hasExplicitPk) {
    // For SQLite tables relying on implicit rowid, explicitly select it
    let query = db
      .selectFrom(tableName)
      .select(['rowid', '*']);
    
    // Add deterministic ordering
    if (sortColumns.length > 0) {
      sortColumns.forEach(col => {
        query = query.orderBy(col, 'asc');
      });
    }
    
    records = await query
      .limit(limit)
      .offset(offset)
      .execute() as any[];
  } else {
    let query = db
      .selectFrom(tableName)
      .selectAll();
    
    // Add deterministic ordering
    if (sortColumns.length > 0) {
      sortColumns.forEach(col => {
        query = query.orderBy(col, 'asc');
      });
    }
    
    records = await query
      .limit(limit)
      .offset(offset)
      .execute();
  }

  // Get total count for hasNextPage calculation
  const [{ count }] = await db
    .selectFrom(tableName)
    .select((eb) => eb.fn.countAll().as('count'))
    .execute();

  // --- FK display value resolution ---
  // 1. Find all columns with a foreignKey
  const fkColumns = Object.values(table.details.columns).filter(
    (col) => col.foreignKey
  );

  // 2. For each FK column, collect all unique FK values in this batch
  const fkValueMap: Record<string, Set<any>> = {};
  for (const col of fkColumns) {
    fkValueMap[col.name] = new Set(
      records.map((r: any) => r[col.name]).filter((v) => v != null)
    );
  }

  // 3. For each FK column, batch fetch related records
  const fkDisplayMap: Record<
    string,
    Record<any, { displayValue: string; icon: string }>
  > = {};
  for (const col of fkColumns) {
    const fk = col.foreignKey!;
    const targetTable = await getTable(connectionId, fk.targetTable);
    const displayColumns =
      require('@/utils/display-columns').determineDisplayColumns({
        ...targetTable,
        details: {
          ...targetTable.details,
          columns: Object.values(targetTable.details.columns),
        },
      });
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
    // Map FK value to display value and icon
    fkDisplayMap[col.name] = Object.fromEntries(
      relatedRecords.map((r: any) => [
        r[fk.targetColumn],
        {
          displayValue: displayColumns
            .map((colName: string) => r[colName])
            .filter(Boolean)
            .join(' '),
          icon: targetTable.details.icon,
        },
      ])
    );
  }

  // 4. Replace FK values in records with display value and icon
  const recordsWithDisplay = records.map((record: any) => {
    const newRecord: Record<string, any> = { ...record };
    for (const col of fkColumns) {
      const val = record[col.name];
      if (val != null && fkDisplayMap[col.name][val] !== undefined) {
        // Get the related table's icon
        const fk = col.foreignKey!;
        // Find the icon from the already-fetched table (from previous getTable call)
        // (We could optimize by caching, but for now, fetch again)
        newRecord[col.name] = {
          value: fkDisplayMap[col.name][val].displayValue,
          icon: fkDisplayMap[col.name][val].icon,
        };
      }
    }
    // For non-FK fields, keep as is
    for (const colName in newRecord) {
      if (!fkColumns.find((c) => c.name === colName)) {
        newRecord[colName] = record[colName];
      }
    }
    return newRecord;
  });

  // 5. Add calculated columns to records
  const {
    addCalculatedColumnsToRecords,
  } = require('@/utils/calculated-columns');
  const finalRecords = addCalculatedColumnsToRecords(
    recordsWithDisplay,
    table.details.calculatedColumns || []
  );

  const totalCount = Number(count);
  const hasNextPage = offset + records.length < totalCount;

  return {
    records: finalRecords,
    hasNextPage,
    nextOffset: hasNextPage ? offset + records.length : undefined,
    total: totalCount,
  };
}

export async function clearTablesForConnection(connectionId: string): Promise<void> {
  const stateDb = await getStateDb();
  
  await stateDb
    .deleteFrom('tables')
    .where('connectionId', '=', connectionId)
    .execute();
  
  logger.info(`Cleared all table metadata for connection ${connectionId}`);
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
    // Insert new table with generated UUID
    const { randomUUID } = await import('crypto');
    await stateDb
      .insertInto('tables')
      .values({
        id: randomUUID(),
        name: table.name,
        schema: table.schema,
        connectionId: table.connectionId,
        details: JSON.stringify(table.details) as any,
      })
      .execute();
  }

  return table;
}
