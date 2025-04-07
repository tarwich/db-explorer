'use server';

import { openConnection } from '@/app/actions/connections';
import { getStateDb } from '@/db/sqlite';
import {
  deserializeDatabaseTable,
  DeserializedTable,
  serializeDatabaseTable,
} from '@/types/connections';
import { determineDisplayColumns } from '@/utils/display-columns';
import { guessForeignKeys } from '@/utils/foreign-key-guesser';
import { normalizeName } from '@/utils/normalize-name';
import { Kysely } from 'kysely';
import { z } from 'zod';

export async function getTables(connectionId: string) {
  const db = await getStateDb();
  const tables = await db
    .selectFrom('tables')
    .where('connectionId', '=', connectionId)
    .selectAll()
    .execute()
    .then((tables) => tables.map(deserializeDatabaseTable));
  return tables;
}

export async function analyzeTables(connectionId: string) {
  try {
    try {
      const stateDb = await getStateDb();
      const db = await openConnection(connectionId);
      const introspection = await db.introspection.getTables();

      const tables = await stateDb
        .selectFrom('tables')
        .where('connectionId', '=', connectionId)
        .selectAll()
        .execute()
        .then((tables) => tables.map(deserializeDatabaseTable));

      for (const table of introspection) {
        const columns = table.columns;

        const payload = {
          connectionId,
          name: table.name,
          schema: table.schema || 'public',
          details: {
            normalizedName: normalizeName(table.name),
            displayColumns: [],
            pk: [],
            columns: [],
          },
        } satisfies DeserializedTable as DeserializedTable;
        const primaryKey = await findPrimaryKey(db, table, columns);
        payload.details = Object.assign(payload.details, {
          pk: primaryKey,
          displayColumns: [],
          normalizedName: normalizeName(table.name),
          columns: columns.map((c) => ({
            name: c.name,
            type: c.dataType,
            nullable: c.isNullable,
            normalizedName: normalizeName(c.name),
          })),
        } as typeof payload.details);
        const displayColumns = determineDisplayColumns(payload);
        payload.details.displayColumns = displayColumns;

        const tableIndex = tables.findIndex(
          (t) => t.schema === table.schema && t.name === table.name
        );

        if (tableIndex === -1) {
          tables.push(payload);
        } else {
          tables[tableIndex] = payload;
        }
      }

      for (const table of tables) {
        await processForeignKeys(db, table, tables);
      }

      for (const table of tables) {
        const tableExists = tables.some(
          (t) => t.schema === table.schema && t.name === table.name
        );

        if (tableExists) {
          await stateDb
            .updateTable('tables')
            .set(serializeDatabaseTable(table))
            .where('connectionId', '=', connectionId)
            .where('schema', '=', table.schema)
            .where('name', '=', table.name)
            .execute();
        } else {
          await stateDb
            .insertInto('tables')
            .values(serializeDatabaseTable(table))
            .execute();
        }
      }

      return {
        success: true,
        tables: await getTables(connectionId),
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    };
  }
}

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
  table: DeserializedTable,
  allTables: DeserializedTable[]
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
