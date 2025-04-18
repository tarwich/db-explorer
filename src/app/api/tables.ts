'use server';

import { openConnection } from '@/app/api/connections';
import { loadConnection } from '@/components/connection-modal/connection-modal.actions';
import { getPlugin, PostgresPlugin } from '@/db/plugins';
import { getStateDb } from '@/db/state-db';
import { DatabaseTable } from '@/types/connections';
import { getBestIcon } from '@/utils/best-icon';
import { guessForeignKeys } from '@/utils/foreign-key-guesser';
import { normalizeName } from '@/utils/normalize-name';
import { Kysely } from 'kysely';
import { plural, singular } from 'pluralize';
import { title } from 'radash';
import { z } from 'zod';

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
  const columns = await PostgresPlugin.describeTable(db, tableId);

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
      icon: 'Box',
    }))
  );

  return table;
}

type Column = DatabaseTable['details']['columns'][number];

const findPrimaryKey = async (
  client: Kysely<any>,
  table: { name: string; schema?: string },
  columns: { name: string }[]
) => {
  const definedPrimaryKey = await client
    .selectFrom('information_schema.table_constraints as tc')
    .innerJoin('information_schema.key_column_usage as kcu', (join) =>
      join
        .onRef('tc.constraint_name', '=', 'kcu.constraint_name')
        .onRef('tc.table_schema', '=', 'kcu.table_schema')
        .onRef('tc.table_name', '=', 'kcu.table_name')
    )
    .select(['kcu.column_name'])
    .where('tc.table_schema', '=', table.schema || 'public')
    .where('tc.table_name', '=', table.name)
    .where('tc.constraint_type', '=', 'PRIMARY KEY')
    .orderBy('kcu.ordinal_position')
    .execute()
    .then((rows) => rows.map((r) => r.column_name as string));

  if (definedPrimaryKey.length > 0) {
    return definedPrimaryKey;
  }

  return [columns[0].name];
};

const connectionSchema = z.object({
  host: z.string(),
  port: z.number(),
  database: z.string(),
  username: z.string(),
  password: z.string().optional(),
});

async function processForeignKeys(
  db: Kysely<any>,
  table: DatabaseTable,
  allTables: DatabaseTable[]
): Promise<void> {
  const foreignKeysResult = await db
    .selectFrom('information_schema.table_constraints as tc')
    .innerJoin('information_schema.key_column_usage as kcu', (join) =>
      join
        .onRef('tc.constraint_name', '=', 'kcu.constraint_name')
        .onRef('tc.table_schema', '=', 'kcu.table_schema')
        .onRef('tc.table_name', '=', 'kcu.table_name')
    )
    .innerJoin('information_schema.constraint_column_usage as ccu', (join) =>
      join
        .onRef('tc.constraint_name', '=', 'ccu.constraint_name')
        .onRef('tc.table_schema', '=', 'ccu.table_schema')
        .onRef('tc.table_name', '=', 'ccu.table_name')
    )
    .select([
      'kcu.column_name',
      'ccu.table_schema as foreign_table_schema',
      'ccu.table_name as foreign_table_name',
      'ccu.column_name as foreign_column_name',
      'tc.constraint_name',
    ])
    .where('tc.constraint_type', '=', 'FOREIGN KEY')
    .where('tc.table_schema', '=', table.schema)
    .where('tc.table_name', '=', table.name)
    .execute();

  // Get actual foreign keys
  const actualForeignKeys = foreignKeysResult.map((fk) => ({
    columnName: fk.column_name,
    targetSchema: fk.foreign_table_schema,
    targetTable: fk.foreign_table_name,
    targetColumn: fk.foreign_column_name,
    isGuessed: false,
  }));

  // Get guessed foreign keys
  const guessedForeignKeys = guessForeignKeys(
    table.details.columns || [],
    allTables
  )
    .filter((guess) => guess.confidence > 0)
    .map((guess) => ({
      columnName: guess.sourceColumn,
      targetSchema: guess.targetSchema,
      targetTable: guess.targetTable,
      targetColumn: guess.targetColumn,
      isGuessed: true,
      confidence: guess.confidence,
    }));

  // Combine actual and guessed foreign keys, preferring actual ones
  const existingColumns = new Set(actualForeignKeys.map((fk) => fk.columnName));

  const foreignKeys = [
    ...actualForeignKeys,
    ...guessedForeignKeys.filter((fk) => !existingColumns.has(fk.columnName)),
  ];

  // Update columns with foreign key information
  if (table.details.columns) {
    for (const column of table.details.columns) {
      const foreignKey = foreignKeys.find(
        (fk) => fk.columnName === column.name
      );
      if (foreignKey) {
        column.foreignKey = {
          targetTable: foreignKey.targetTable,
          targetColumn: foreignKey.targetColumn,
          isGuessed: foreignKey.isGuessed,
        };
      }
    }
  }
}
