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
import pg from 'pg';
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

        const tableExists = tables.some(
          (t) => t.schema === table.schema && t.name === table.name
        );
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

        if (tableExists) {
          await stateDb
            .updateTable('tables')
            .set(serializeDatabaseTable(payload))
            .where('connectionId', '=', connectionId)
            .where('schema', '=', payload.schema)
            .where('name', '=', payload.name)
            .execute();
        } else {
          await stateDb
            .insertInto('tables')
            .values(serializeDatabaseTable(payload))
            .execute();
        }
      }

      //   // PASS 3: Process foreign key relationships
      //   for (const table of tables) {
      //     await processForeignKeys(client, table, tables);
      //   }

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

async function getBasicTableInfo(client: pg.Client): Promise<DatabaseTable[]> {
  const tablesResult = await client.query(`
    SELECT
      t.table_schema as schema,
      t.table_name as name,
      t.table_type as type,
      obj_description(
        (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass::oid,
        'pg_class'
      ) as description
    FROM information_schema.tables t
    WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY t.table_schema, t.table_name
  `);

  return tablesResult.rows.map((table) => ({
    id: `${table.schema}.${table.name}`,
    schema: table.schema,
    name: table.name,
    normalizedName: normalizeName(table.name),
    type: table.type.toLowerCase(),
    description: table.description || undefined,
  }));
}

async function getPrimaryKeyAndColumns(
  client: pg.Client,
  table: DatabaseTable
): Promise<void> {
  // Get primary key information
  const primaryKeyResult = await client.query(
    `
    SELECT
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = $1
      AND tc.table_name = $2
    ORDER BY kcu.ordinal_position
  `,
    [table.schema, table.name]
  );

  if (primaryKeyResult.rows.length > 0) {
    table.primaryKey = primaryKeyResult.rows.map((row) => row.column_name);
  }

  // Get column information
  const columnsResult = await client.query(
    `
    SELECT
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      c.character_maximum_length,
      c.numeric_precision,
      c.numeric_scale
    FROM information_schema.columns c
    WHERE c.table_schema = $1
      AND c.table_name = $2
    ORDER BY c.ordinal_position
  `,
    [table.schema, table.name]
  );

  table.columns = columnsResult.rows.map((column) => ({
    ...column,
    normalizedName: normalizeName(column.column_name),
  }));

  // Determine display columns
  if (table.columns) {
    table.displayColumns = determineDisplayColumns(
      table.columns,
      table.primaryKey
    );
  }
}

async function processForeignKeys(
  client: pg.Client,
  table: DatabaseTable,
  allTables: DatabaseTable[]
): Promise<void> {
  const foreignKeysResult = await client.query(
    `
    SELECT
      kcu.column_name,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = $1
      AND tc.table_name = $2
  `,
    [table.schema, table.name]
  );

  // Get actual foreign keys
  const actualForeignKeys = foreignKeysResult.rows.map((fk) => ({
    columnName: fk.column_name,
    targetSchema: fk.foreign_table_schema,
    targetTable: fk.foreign_table_name,
    targetColumn: fk.foreign_column_name,
    isGuessed: false,
  }));

  // Get guessed foreign keys
  const guessedForeignKeys = guessForeignKeys(table.columns || [], allTables)
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
  table.foreignKeys = [
    ...actualForeignKeys,
    ...guessedForeignKeys.filter((fk) => !existingColumns.has(fk.columnName)),
  ];

  // Update columns with foreign key information
  if (table.columns) {
    for (const column of table.columns) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnName === column.column_name
      );
      if (foreignKey) {
        const targetTable = allTables.find(
          (t) =>
            t.schema === foreignKey.targetSchema &&
            t.name === foreignKey.targetTable
        );
        column.foreignKey = {
          ...foreignKey,
          displayColumns: targetTable?.displayColumns,
        };
      }
    }
  }
}
