'use server';

import { DatabaseConnection } from '@/types/connections';
import { z } from 'zod';
import pg from 'pg';
import {
  guessForeignKeys,
  combineActualAndGuessedForeignKeys,
} from '@/utils/foreign-key-guesser';
import { DatabaseTable } from '@/stores/database';

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
      const result = await client.query(`
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

      await client.end();
      return {
        success: true,
        tables: result.rows,
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

export async function getTableData(
  connection: DatabaseConnection,
  schema: string,
  table: string,
  page: number = 1,
  pageSize: number = 50
) {
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

      // Get all tables first for foreign key guessing
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

      const allTables: DatabaseTable[] = tablesResult.rows.map((table) => ({
        id: `${table.schema}.${table.name}`,
        schema: table.schema,
        name: table.name,
        type: table.type.toLowerCase(),
        description: table.description || undefined,
      }));

      // Get column information with foreign key relationships
      const columnsResult = await client.query(
        `
        WITH foreign_keys AS (
          SELECT
            kcu.column_name,
            kcu.constraint_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.key_column_usage kcu
          JOIN information_schema.constraint_column_usage ccu
            ON kcu.constraint_name = ccu.constraint_name
            AND kcu.constraint_schema = ccu.constraint_schema
          WHERE kcu.table_schema = $1
            AND kcu.table_name = $2
            AND kcu.constraint_name IN (
              SELECT constraint_name
              FROM information_schema.table_constraints
              WHERE constraint_type = 'FOREIGN KEY'
            )
        )
        SELECT
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length,
          c.numeric_precision,
          c.numeric_scale,
          fk.foreign_table_schema,
          fk.foreign_table_name,
          fk.foreign_column_name
        FROM information_schema.columns c
        LEFT JOIN foreign_keys fk ON c.column_name = fk.column_name
        WHERE c.table_schema = $1 AND c.table_name = $2
        ORDER BY c.ordinal_position
        `,
        [schema, table]
      );

      // Get guessed foreign keys
      const guessedForeignKeys = guessForeignKeys(
        columnsResult.rows,
        allTables
      );

      // Combine actual and guessed foreign keys
      const enhancedColumns = columnsResult.rows.map((column) =>
        combineActualAndGuessedForeignKeys(column, guessedForeignKeys)
      );

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

      await client.end();
      return {
        success: true,
        columns: enhancedColumns,
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
