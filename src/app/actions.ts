'use server';

import { DatabaseConnection } from '@/types/connections';
import { record, z } from 'zod';
import pg from 'pg';
import { guessForeignKeys } from '@/utils/foreign-key-guesser';
import { DatabaseTable } from '@/stores/database';
import { determineDisplayColumns } from '@/utils/display-columns';
import { normalizeName } from '@/utils/normalize-name';

const connectionSchema = z.object({
  host: z.string(),
  port: z.number(),
  database: z.string(),
  username: z.string(),
  password: z.string().optional(),
});

export async function testConnection(
  connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>
) {
  try {
    const validatedConnection = connectionSchema.parse(connection);
    const client = new pg.Client({
      host: validatedConnection.host,
      port: validatedConnection.port,
      database: validatedConnection.database,
      user: validatedConnection.username,
      password: validatedConnection.password,
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    };
  }
}

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

export async function getTables(connection: DatabaseConnection) {
  try {
    const validatedConnection = connectionSchema.parse(connection);
    const client = new pg.Client({
      host: validatedConnection.host,
      port: validatedConnection.port,
      database: validatedConnection.database,
      user: validatedConnection.username,
      password: validatedConnection.password,
    });

    try {
      await client.connect();

      // PASS 1: Get basic table information
      const tables = await getBasicTableInfo(client);

      // PASS 2: Get primary keys and columns for each table
      for (const table of tables) {
        await getPrimaryKeyAndColumns(client, table);
      }

      // PASS 3: Process foreign key relationships
      for (const table of tables) {
        await processForeignKeys(client, table, tables);
      }

      await client.end();
      return {
        success: true,
        tables,
      };
    } catch (error) {
      await client.end().catch(() => {});
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    };
  }
}

export async function getTableData({
  connection,
  schema,
  table,
  page = 1,
  pageSize = 50,
  filter = '',
}: {
  connection: DatabaseConnection;
  schema: string;
  table: string;
  page: number;
  pageSize: number;
  filter?: string;
}) {
  try {
    const validatedConnection = connectionSchema.parse(connection);
    const client = new pg.Client({
      host: validatedConnection.host,
      port: validatedConnection.port,
      database: validatedConnection.database,
      user: validatedConnection.username,
      password: validatedConnection.password,
    });

    try {
      await client.connect();

      // Get table metadata first
      const tableMetadata = await getTables(connection);
      if (!tableMetadata.success || !tableMetadata.tables) {
        throw new Error(tableMetadata.error || 'Failed to get table metadata');
      }

      const targetTable = tableMetadata.tables.find(
        (t) => t.schema === schema && t.name === table
      );

      if (!targetTable) {
        throw new Error('Table not found');
      }

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM ${client.escapeIdentifier(
          schema
        )}.${client.escapeIdentifier(table)}`
      );

      // Get paginated data
      const offset = (page - 1) * pageSize;
      const dataResult = await client.query(
        `
        SELECT *
        FROM ${client.escapeIdentifier(schema)}.${client.escapeIdentifier(
          table
        )}
        LIMIT $1
        OFFSET $2
        `,
        [pageSize, offset]
      );

      // Go through the columns and add the foreign key information
      for (const column of targetTable.columns || []) {
        const foreignKey = targetTable.foreignKeys?.find(
          (fk) => fk.columnName === column.column_name
        );
        if (foreignKey) {
          const targetForeignTable = tableMetadata.tables.find(
            (t) =>
              t.schema === foreignKey.targetSchema &&
              t.name === foreignKey.targetTable
          );
          column.foreignKey = {
            ...foreignKey,
            displayColumns: targetForeignTable?.displayColumns,
          };
        }
      }

      await client.end();

      return {
        success: true,
        columns: targetTable.columns || [],
        primaryKey: targetTable.primaryKey,
        foreignKeys: targetTable.foreignKeys,
        rows: dataResult.rows,
        totalRows: parseInt(countResult.rows[0].total),
      };
    } catch (error) {
      await client.end().catch(() => {});
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    };
  }
}

export async function getPage({
  connection,
  schema,
  table,
  page = 1,
  pageSize = 50,
  filter = '',
}: {
  connection: DatabaseConnection;
  schema: string;
  table: string;
  page: number;
  pageSize: number;
  filter?: string;
}) {
  try {
    const validatedConnection = connectionSchema.parse(connection);
    const client = new pg.Client({
      host: validatedConnection.host,
      port: validatedConnection.port,
      database: validatedConnection.database,
      user: validatedConnection.username,
      password: validatedConnection.password,
    });

    try {
      await client.connect();

      const query = `
        SELECT *
        FROM ${client.escapeIdentifier(schema)}.${client.escapeIdentifier(
        table
      )}
        LIMIT $1
        OFFSET $2
      `;

      const result = await client.query(query, [
        pageSize,
        (page - 1) * pageSize,
      ]);

      await client.end();
      return {
        success: true as const,
        rows: result.rows,
      };
    } catch (error) {
      await client.end();
      return {
        success: false as const,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      await client.end();
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Invalid request',
    };
  }
}

export async function updateRecord(
  connection: DatabaseConnection,
  schema: string,
  table: string,
  record: Record<string, unknown>
): Promise<{
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}> {
  try {
    const validatedConnection = connectionSchema.parse(connection);
    const client = new pg.Client({
      host: validatedConnection.host,
      port: validatedConnection.port,
      database: validatedConnection.database,
      user: validatedConnection.username,
      password: validatedConnection.password,
    });

    try {
      await client.connect();

      // Build the UPDATE query dynamically
      const setClause = Object.entries(record)
        .filter(([key]) => key !== 'id') // Exclude id from SET clause
        .map(
          ([key], index) => `${client.escapeIdentifier(key)} = $${index + 2}`
        )
        .join(', ');

      const values = [
        record.id,
        ...Object.entries(record)
          .filter(([key]) => key !== 'id')
          .map(([, value]) => value),
      ];

      const query = `
        UPDATE ${client.escapeIdentifier(schema)}.${client.escapeIdentifier(
        table
      )}
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.end();

      return {
        success: true,
        data: result.rows[0],
      };
    } catch (error) {
      await client.end().catch(() => {});
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    };
  }
}
